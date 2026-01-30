import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_user_profile_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account (as normal user)
  const userConnection: api.IConnection = { host: connection.host };
  const user: IEconomicForumUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(user);
  // Step 2: Create a post as prerequisite for the target user
  const post: IEconomicForumPost =
    await generate_random_economic_forum_user_posts_create(userConnection, {});
  typia.assert(post);
  // Step 3: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(admin);
  // Step 4: Validate admin can update any user's profile
  // Update using adminConnection and user's id
  const updatedUser: IEconomicForumUser =
    await api.functional.economicForum.user.users.update(adminConnection, {
      userId: user.id,
      body: {} satisfies IEconomicForumUser.IUpdate, // IUpdate is empty, so empty object is valid
    });
  typia.assert(updatedUser);
  // Step 5: Validate that update succeeded and user id remains unchanged
  // The IEconomicForumUser type only has an id property, so we validate that
  // the returned user has the same id as the original user (as expected)
  TestValidator.equals(
    "user id unchanged after admin update",
    updatedUser.id,
    user.id,
  );
}
