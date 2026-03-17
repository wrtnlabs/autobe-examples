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

export async function test_api_email_verification_update_to_verified(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const createdMember =
    await generate_random_community_platform_admin_email_verifications_create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16) satisfies string as string,
          username: `${RandomGenerator.alphabets(8)}_${RandomGenerator.alphabets(4)}`,
        } satisfies ICommunityPlatformMemberEmailVerification.ICreate,
      },
    );
  typia.assert(createdMember);
  const body = {
    status: "verified",
    verified_at: new Date().toISOString(),
    invalidated_at: null,
  } satisfies ICommunityPlatformMemberEmailVerification.IUpdate;
  const updated =
    await api.functional.communityPlatform.admin.email_verifications.update(
      adminConnection,
      {
        emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(updated);
  TestValidator.equals("status becomes verified", updated.status, "verified");
  TestValidator.predicate(
    "verified_at is populated",
    updated.verified_at !== null,
  );
  TestValidator.equals(
    "invalidated_at remains null",
    updated.invalidated_at,
    null,
  );
  TestValidator.equals("record remains active", updated.deleted_at, null);
  TestValidator.equals("owner remains active", updated.member.deleted_at, null);
}
