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
import { generate_random_shopping_mall_administrator_banned_users_create } from "../../../generate/generate_random_shopping_mall_administrator_banned_users_create";
import { prepare_random_shopping_mall_banned_user } from "../../../prepare/prepare_random_shopping_mall_banned_user";

export async function test_api_administrator_banned_user_create_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Admin account registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: "12345678",
    },
  });
  typia.assert(admin);
  // Update adminConnection.headers with authorization token
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${admin.token.access}`,
  };
  typia.assert(adminConnection.headers);
  // Scenario 1: Admin bans a customer user successfully
  const bannedCustomer =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shoppingMallCustomerId: typia.random<
            string & typia.tags.Format<"uuid">
          >(),
          banReason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "bannedCustomer has customer summary",
    bannedCustomer.customer !== null && bannedCustomer.customer !== undefined,
  );
  TestValidator.predicate(
    "bannedCustomer has createdAt",
    typeof bannedCustomer.createdAt === "string",
  );
  TestValidator.predicate(
    "bannedCustomer has updatedAt",
    typeof bannedCustomer.updatedAt === "string",
  );
  // Scenario 2: Admin bans a seller user successfully
  const bannedSeller =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shoppingMallSellerId: typia.random<
            string & typia.tags.Format<"uuid">
          >(),
          banReason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(bannedSeller);
  TestValidator.predicate(
    "bannedSeller has seller summary",
    bannedSeller.seller !== null && bannedSeller.seller !== undefined,
  );
  TestValidator.predicate(
    "bannedSeller has createdAt",
    typeof bannedSeller.createdAt === "string",
  );
  TestValidator.predicate(
    "bannedSeller has updatedAt",
    typeof bannedSeller.updatedAt === "string",
  );
  // Scenario 3: Admin attempts to ban with invalid bodies
  // Missing banReason - Here send banReason as undefined to simulate missing
  await TestValidator.error("ban without banReason throws", async () => {
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shoppingMallCustomerId: typia.random<
            string & typia.tags.Format<"uuid">
          >(),
          banReason: undefined,
        },
      },
    );
  });
  // Both shoppingMallCustomerId and shoppingMallSellerId provided
  await TestValidator.error(
    "ban with both customer and seller ids throws",
    async () => {
      await generate_random_shopping_mall_administrator_banned_users_create(
        adminConnection,
        {
          body: {
            shoppingMallCustomerId: typia.random<
              string & typia.tags.Format<"uuid">
            >(),
            shoppingMallSellerId: typia.random<
              string & typia.tags.Format<"uuid">
            >(),
            banReason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    },
  );
  // Authorization enforcement: try banning with no authorization
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "ban attempt without admin authorization throws",
    async () => {
      await generate_random_shopping_mall_administrator_banned_users_create(
        anonymousConnection,
        {
          body: {
            shoppingMallCustomerId: typia.random<
              string & typia.tags.Format<"uuid">
            >(),
            banReason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    },
  );
}
