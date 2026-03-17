import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_password_resets_create } from "../../../generate/generate_random_community_platform_admin_password_resets_create";
import { prepare_random_community_platform_member_password_reset } from "../../../prepare/prepare_random_community_platform_member_password_reset";

export async function test_api_password_reset_request_unknown_email_nondisclosure(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  const unknownEmail = typia.random<string & tags.Format<"email">>();
  const body = {
    email: unknownEmail,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMemberPasswordReset.ICreate;
  const output =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "href is preserved in generic success response",
    output.href,
    body.href,
  );
  TestValidator.equals(
    "referrer is preserved in generic success response",
    output.referrer,
    body.referrer,
  );
  TestValidator.notEquals(
    "unknown requested email is not disclosed as a member account",
    output.member.email,
    body.email,
  );
}
