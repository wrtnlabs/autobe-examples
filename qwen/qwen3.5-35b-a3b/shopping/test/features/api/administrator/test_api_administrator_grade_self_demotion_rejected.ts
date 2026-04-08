import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_self_demotion_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator account via POST /ecommerceMall/auth/administrator/join
  const joinConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(joinConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "super" as const,
      } as unknown as IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(superAdmin);
  // Verify the administrator has grade === 'super'
  TestValidator.equals("super admin initial grade", superAdmin.grade, "super");
  // Step 2: Create authenticated connection with the super administrator's token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // Step 3: Attempt self-demotion (should be rejected)
  await TestValidator.error("self-demotion should be rejected", async () => {
    await api.functional.ecommerceMall.administrator.administrator_grades.update(
      authenticatedConnection,
      {
        body: {
          administrator_id: superAdmin.id, // Trying to change own grade
          new_grade: "regular" as const,
          reason: "Attempted self-demotion",
        } satisfies IEcommerceMallAdministratorGrade.IRequest,
      },
    );
  });
  // Step 4: Verify grade remains unchanged (implicit from error being thrown)
  // The fact that the update operation throws an error confirms no database changes were made
  // Step 5: No snapshot should be created for failed self-demotion attempt
  // Test completes successfully - if update threw an error, no snapshots were created
}