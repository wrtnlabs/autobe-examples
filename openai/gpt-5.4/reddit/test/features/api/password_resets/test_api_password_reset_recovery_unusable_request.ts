import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
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
import { generate_random_community_platform_admin_password_resets_create } from "../../../generate/generate_random_community_platform_admin_password_resets_create";
import { prepare_random_community_platform_member_password_reset } from "../../../prepare/prepare_random_community_platform_member_password_reset";

export async function test_api_password_reset_recovery_unusable_request(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const passwordReset =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {
        body: {
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      },
    );
  typia.assert(passwordReset);
  const invalidToken: string = RandomGenerator.alphaNumeric(32);
  const firstAttempt = {
    token: invalidToken,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMemberPasswordReset.IUpdate;
  await TestValidator.error(
    "rejects recovery for an unusable reset attempt",
    async () => {
      await api.functional.communityPlatform.admin.password_resets.updatePassword(
        adminConnection,
        {
          passwordResetId: passwordReset.id,
          body: firstAttempt,
        },
      );
    },
  );
  const secondAttempt = {
    token: invalidToken,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMemberPasswordReset.IUpdate;
  await TestValidator.error(
    "failed recovery does not consume or repair the reset artifact",
    async () => {
      await api.functional.communityPlatform.admin.password_resets.updatePassword(
        adminConnection,
        {
          passwordResetId: passwordReset.id,
          body: secondAttempt,
        },
      );
    },
  );
}
