import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot";
import { prepare_random_shopping_mall_review_snapshot } from "../../../prepare/prepare_random_shopping_mall_review_snapshot";

export async function test_api_administrator_review_snapshot_creation_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test creating an immutable review snapshot with the minimal required fields only, rating (1-5) without optional review body.
  // 1. Admin join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin_${typia.random<string & tags.Format<"email">>()}`,
        password: "admin_password123",
      },
    });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare minimal create body with a valid rating only
  const createBody: IShoppingMallReviewSnapshot.ICreate = {
    shoppingMallProductReviewId: typia.random<string & tags.Format<"uuid">>(),
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >() as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    // Omit `body` so that it is null/undefined
    // Omit `snapshotCreatedAt`, `createdAt`, `updatedAt` as will be set by backend
    snapshotCreatedAt: new Date().toISOString(), // provide minimal timestamp
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // But according to scenario we should not send snapshotCreatedAt, createdAt, updatedAt because backend sets these timestamps automatically.
  // Fix createBodyMinimal: cast as DeepPartial<ICreate> without timestamps
  const createBodyMinimal: DeepPartial<IShoppingMallReviewSnapshot.ICreate> = {
    shoppingMallProductReviewId: createBody.shoppingMallProductReviewId,
    rating: createBody.rating,
    body: null,
  };
  // 3. Call createReviewSnapshot with minimal required fields (rating only, optional body null undefined)
  const createdSnapshot: IShoppingMallReviewSnapshot =
    await generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot(
      adminConnection,
      {
        body: createBodyMinimal as IShoppingMallReviewSnapshot.ICreate,
      },
    );
  // 4. Assert response type and schema
  typia.assert(createdSnapshot);
  // 5. Validate rating is same as sent
  TestValidator.equals(
    "rating matches input",
    createdSnapshot.rating,
    createBodyMinimal.rating,
  );
  // 6. Validate body is null (the optional review content)
  TestValidator.equals("body is null", createdSnapshot.body, null);
  // 7. Validate timestamps exist and are ISO datetime strings
  TestValidator.predicate(
    "snapshotCreatedAt is ISO datetime",
    typeof createdSnapshot.snapshotCreatedAt === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?([Z]|([+-]([01][0-9]|2[0-3]):[0-5][0-9]))$/.test(
        createdSnapshot.snapshotCreatedAt,
      ),
  );
  TestValidator.predicate(
    "createdAt is ISO datetime",
    typeof createdSnapshot.createdAt === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?([Z]|([+-]([01][0-9]|2[0-3]):[0-5][0-9]))$/.test(
        createdSnapshot.createdAt,
      ),
  );
  TestValidator.predicate(
    "updatedAt is ISO datetime",
    typeof createdSnapshot.updatedAt === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?([Z]|([+-]([01][0-9]|2[0-3]):[0-5][0-9]))$/.test(
        createdSnapshot.updatedAt,
      ),
  );
  // 8. Validate deletedAt is null for active record
  TestValidator.equals("deletedAt is null", createdSnapshot.deletedAt, null);
}
