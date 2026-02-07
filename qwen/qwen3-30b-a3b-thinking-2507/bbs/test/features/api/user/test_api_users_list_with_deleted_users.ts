import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_users_list_with_deleted_users(
  connection: api.IConnection,
): Promise<void> {
  // Call the endpoint with deleted: true to include soft-deleted users
  const responseWithDeleted =
    await api.functional.economyPoliticsBoard.users.index(connection, {
      body: {
        deleted: true, // Include soft-deleted users
      },
    });
  typia.assert(responseWithDeleted);
  // Call the endpoint with deleted: false to get only active users
  const responseWithoutDeleted =
    await api.functional.economyPoliticsBoard.users.index(connection, {
      body: {
        deleted: false, // Exclude soft-deleted users (only active users)
      },
    });
  typia.assert(responseWithoutDeleted);
  // Validate that with deleted: true, the total records count is greater than or equal to when deleted: false
  TestValidator.predicate(
    "Total records with deleted: true should be greater than or equal to total records with deleted: false",
    responseWithDeleted.pagination.records >=
      responseWithoutDeleted.pagination.records,
  );
  // Verify that deleted_at for users in withDeleted response includes non-null values
  const deletedUser = responseWithDeleted.data.find(
    (user) => user.deleted_at !== null,
  );
  TestValidator.predicate(
    "Some users in the withDeleted response should have deleted_at not null",
    !!deletedUser,
  );
  // Verify that deleted_at for users in withoutDeleted response are all null
  const allActive = responseWithoutDeleted.data.every(
    (user) => user.deleted_at === null,
  );
  TestValidator.predicate(
    "All users in the withoutDeleted response should have deleted_at null",
    allActive,
  );
}
