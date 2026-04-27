import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test retrieving a non-existent administrator registration request returns 404.
 *
 * Validates that the API correctly returns a 404 Not Found status when attempting to retrieve an administrator registration request by a UUID that has no corresponding record. This verifies the endpoint's error handling for missing resources.
 *
 * A super administrator account is created for authentication, then a GET request is made with the zero UUID (00000000-0000-0000-0000-000000000000) which cannot correspond to any existing registration request. The system should return a 404 error rather than empty data, null response, or an internal server error.
 *
 * 1. Register a super administrator via the join endpoint.
 * 2. Attempt to retrieve an admin registration request with a non-existent UUID.
 * 3. Validate that a 404 HTTP error is thrown.
 */
export async function test_api_admin_registration_request_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register a super administrator for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // Test: Retrieve a non-existent admin registration request should return 404
  await TestValidator.httpError(
    "retrieve non-existent admin registration request",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.at(
        superAdminConnection,
        {
          requestId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
