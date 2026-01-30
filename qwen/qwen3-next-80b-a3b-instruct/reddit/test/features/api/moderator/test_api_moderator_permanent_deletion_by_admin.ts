import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_permanent_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a system admin account using join
  const adminJoinArgs = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  };
  const admin = await authorize_admin_join(connection, adminJoinArgs);
  typia.assert(admin);
  // Step 2: Create a moderator account using join
  const moderatorJoinArgs = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  };
  const moderator = await authorize_moderator_join(
    connection,
    moderatorJoinArgs,
  );
  typia.assert(moderator);
  // Step 3: Authenticate as the admin to establish privileged context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminJoinArgs.body.password,
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Step 4: Attempt permanent deletion of the moderator account
  await api.functional.communityBbs.moderator.moderators.erase(
    adminConnection,
    {
      moderatorId: moderator.id,
    },
  );
  // Step 5: Validate deletion was permanent by attempting to delete the same moderator again
  // The moderator record should be completely gone, so deletion should return 404 (Not Found)
  await TestValidator.error(
    "permanent deletion makes moderator inaccessible",
    async () => {
      await api.functional.communityBbs.moderator.moderators.erase(
        adminConnection,
        {
          moderatorId: moderator.id,
        },
      );
    },
  );
}
