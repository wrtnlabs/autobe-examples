import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_email_verifications_create } from "../../../generate/generate_random_community_platform_admin_email_verifications_create";
import { prepare_random_community_platform_member_email_verification } from "../../../prepare/prepare_random_community_platform_member_email_verification";

export async function test_api_member_registration_duplicate_username_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const username: string = `duplicate-username-${RandomGenerator.alphaNumeric(8)}`;
  const firstBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username,
  } satisfies ICommunityPlatformMemberEmailVerification.ICreate;
  const firstMember =
    await generate_random_community_platform_admin_email_verifications_create(
      adminConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(firstMember);
  TestValidator.equals(
    "first registration email matches input",
    firstMember.email,
    firstBody.email,
  );
  TestValidator.equals(
    "first registration starts unverified",
    firstMember.emailVerified,
    false,
  );
  const secondBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username,
  } satisfies ICommunityPlatformMemberEmailVerification.ICreate;
  TestValidator.notEquals(
    "second attempt uses a different email",
    secondBody.email,
    firstBody.email,
  );
  await TestValidator.error(
    "duplicate username registration is rejected",
    async () => {
      await generate_random_community_platform_admin_email_verifications_create(
        adminConnection,
        {
          body: secondBody,
        },
      );
    },
  );
  TestValidator.equals(
    "failed duplicate username attempt does not alter first member email",
    firstMember.email,
    firstBody.email,
  );
}
