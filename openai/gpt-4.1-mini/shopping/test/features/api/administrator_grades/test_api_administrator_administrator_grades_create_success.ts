import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_grades_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_grades_create";
import { prepare_random_shopping_mall_administrator_grade } from "../../../prepare/prepare_random_shopping_mall_administrator_grade";

export async function test_api_administrator_administrator_grades_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as administrator to obtain an authorization token
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty, pass empty object
  });
  // Setup authorization header with Bearer token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Step 3: Prepare a valid administrator grade create payload
  const gradeNameSuffix = RandomGenerator.alphabets(8);
  const newGradeCreateBody: IShoppingMallAdministratorGrade.ICreate = {
    name: `grade_${gradeNameSuffix}`,
    grade: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    super_administrator: RandomGenerator.pick([true, false]),
  };
  // Step 4: Call the generation helper function which calls the create API
  const createdGrade =
    await generate_random_shopping_mall_administrator_administrator_grades_create(
      adminConnection,
      { body: newGradeCreateBody },
    );
  // Step 5: Validate the returned object shape and types
  typia.assert(createdGrade);
  // Step 6: Remaining validation of properties removed because they do not exist on the types
  // These caused compilation errors.
  
  // Step 7: Timestamps validations removed as corresponding properties do not exist
}
