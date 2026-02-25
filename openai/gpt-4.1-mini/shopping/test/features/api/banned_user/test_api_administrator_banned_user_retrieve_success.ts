import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_user_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123",
    },
  });
  typia.assert(administrator);
  // 2. Use the obtained authorization token for adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // Sanity check - administrator properties assertion
  typia.assert(administrator.id);
  typia.assert(administrator.token.access);
  // 3. The scenario requires a banned user record to retrieve
  // Since no creation API is specified, generate a random bannedUserId for positive test
  // Usually, in e2e test env, a banned user record creation would be prerequisite,
  // but given info, we test retrieval by calling at API with a valid UUID format
  // Generate a random UUID for bannedUserId
  const bannedUserIdValid = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve banned user by ID
  const bannedUser =
    await api.functional.shoppingMall.administrator.bannedUsers.at(
      adminConnection,
      { bannedUserId: bannedUserIdValid },
    );
  typia.assert(bannedUser);
  // Validate banned user basic properties
  TestValidator.predicate(
    "bannedUser has id",
    typeof bannedUser.id === "string" && bannedUser.id.length > 0,
  );
  TestValidator.predicate(
    "bannedUser has banReason",
    typeof bannedUser.banReason === "string" && bannedUser.banReason.length > 0,
  );
  TestValidator.predicate(
    "bannedUser has createdAt",
    bannedUser.createdAt !== null && typeof bannedUser.createdAt === "string",
  );
  TestValidator.predicate(
    "bannedUser has updatedAt",
    bannedUser.updatedAt !== null && typeof bannedUser.updatedAt === "string",
  );
  // Check timestamps format by typia
  typia.assert(bannedUser.createdAt);
  typia.assert(bannedUser.updatedAt);
  // deletedAt can be null
  if (bannedUser.deletedAt !== null) typia.assert(bannedUser.deletedAt);
  // Check for either a customer or seller summary in the banned user
  if (bannedUser.customer !== null && bannedUser.customer !== undefined) {
    typia.assert(bannedUser.customer);
    TestValidator.predicate(
      "bannedUser.customer has id",
      typeof bannedUser.customer.id === "string",
    );
  } else if (bannedUser.seller !== null && bannedUser.seller !== undefined) {
    typia.assert(bannedUser.seller);
    TestValidator.predicate(
      "bannedUser.seller has id",
      typeof bannedUser.seller.id === "string",
    );
  }
  // 5. Test error handling: non-existent bannedUserId
  const bannedUserIdInvalid = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "retrieve with non-existent bannedUserId",
    async () => {
      await api.functional.shoppingMall.administrator.bannedUsers.at(
        adminConnection,
        {
          bannedUserId: bannedUserIdInvalid as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
