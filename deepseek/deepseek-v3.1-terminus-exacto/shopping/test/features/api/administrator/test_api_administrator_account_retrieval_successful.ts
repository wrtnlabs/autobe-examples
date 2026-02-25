import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_account_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create an administrator account first
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(joinResult);
  // Retrieve the administrator account using the created ID
  const retrievedAdmin = await api.functional.ecommerce.administrators.at(
    adminConnection,
    {
      administratorId: joinResult.id,
    },
  );
  typia.assert(retrievedAdmin);
  // Validate that all expected fields are present and correct
  TestValidator.equals(
    "ID should match created administrator",
    retrievedAdmin.id,
    joinResult.id,
  );
  TestValidator.equals(
    "Email should match created administrator",
    retrievedAdmin.email,
    joinResult.email,
  );
  // Validate format constraints from IEcommerceAdministrator schema
  TestValidator.predicate("ID should be valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedAdmin.id,
    ),
  );
  TestValidator.predicate("Email should be valid email format", () =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      retrievedAdmin.email,
    ),
  );
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at should be valid ISO date-time format",
    () =>
      !isNaN(new Date(retrievedAdmin.created_at).getTime()) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.created_at),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date-time format",
    () =>
      !isNaN(new Date(retrievedAdmin.updated_at).getTime()) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null for active account",
    retrievedAdmin.deleted_at,
    null,
  );
  // Verify the response structure matches IEcommerceAdministrator schema
  TestValidator.predicate(
    "should have all required properties",
    () =>
      typeof retrievedAdmin.id === "string" &&
      typeof retrievedAdmin.email === "string" &&
      typeof retrievedAdmin.created_at === "string" &&
      typeof retrievedAdmin.updated_at === "string" &&
      (retrievedAdmin.deleted_at === null ||
        typeof retrievedAdmin.deleted_at === "string"),
  );
}
