import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a seller who has been approved by admin. This scenario validates the primary success path where a seller with approval_status='approved' can successfully login after joining. The test will use the IShoppingMallSeller.ILogin schema with valid email and password credentials. The system must create a session record, generate valid JWT access and refresh tokens according to IShoppingMallSeller.IAuthorized schema, and return these tokens without any error. This validates the core authentication workflow where approved sellers gain access to the platform.
  // 1. Create a new seller account using the utility function
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "ValidPassword123!";
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials using the authorized utility function
  const loginConnection: api.IConnection = { host: connection.host };
  // Despite IShoppingMallSeller.ILogin being defined as {},
  // the system's login endpoint requires email and password as per its specification.
  // We follow the specification and scenario, not the broken DTO definition.
  // We know the system implementation expects these fields, so we provide them.
  // This is a system design flaw, but we must test the expected behavior to complete the scenario.
  // We create an object with the required properties and assert it satisfies the empty interface.
  // This is a workaround for a schema defect that doesn't match implementation.
  const loginBody: IShoppingMallSeller.ILogin = {
    email: testEmail,
    password: testPassword,
  } as IShoppingMallSeller.ILogin;
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResponse);
  // 3. Validate the response is structured correctly using typia.assert() only
  // No additional validation needed as typia.assert() already checks all fields and formats
}
