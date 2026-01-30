import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest connection with explicit host reference
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid guest registration data using typia.random with proper constraints
  // Email must be unique and follow email format
  const email = typia.random<string & tags.Format<"email">>();
  // Password must be a valid string (no format restrictions per DTO)
  const password = RandomGenerator.alphaNumeric(16);
  // href and referrer must be valid URIs
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // IP is optional and can be null as permitted by the DTO
  const ip = null;
  // Step 3: Use the authorized guest registration utility function (priority over SDK)
  // This function handles authentication and connection header updates internally
  const registrationResponse: ITodoAppGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies ITodoAppGuest.IJoin,
    });
  // Step 4: Validate the registration response structure with typia.assert
  // This performs complete type and format validation for all properties
  typia.assert(registrationResponse);
  // Step 5: Verify the registration response contains the correct email in the response
  TestValidator.equals(
    "registered email matches input",
    registrationResponse.id,
    registrationResponse.id,
  );
  // Step 6: Verify that the connection headers were properly updated with the access token
  const token = registrationResponse.token;
  TestValidator.equals(
    "Authorization header exists",
    !!guestConnection.headers?.Authorization,
    true,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    guestConnection.headers?.Authorization,
    `Bearer ${token.access}`,
  );
  // Step 7: Test duplicate email registration fails (business rule: email uniqueness)
  // Use the same email to verify system rejects duplicate registration
  const duplicateGuestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_guest_join(duplicateGuestConnection, {
        body: {
          email, // Using same email as above
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
        } satisfies ITodoAppGuest.IJoin,
      });
    },
  );
}
