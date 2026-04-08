import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_retrieve_forbidden_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator who will have valid request data
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string satisfies string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create a customer who submits an admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 3. Customer submits an admin request (creates admin request data)
  const adminRequestConnection: api.IConnection = { host: connection.host };
  const adminRequest = await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminRequest);
  // 4. Create a regular admin account for testing
  // The admin account should NOT have super_admin privileges
  // We'll use admin login with appropriate credentials
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  // Create a regular admin through admin request and approval flow
  // First, create another customer who will request admin privileges
  const regularAdminCandidateConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_join(regularAdminCandidateConnection, {
    body: {
      email: regularAdminEmail,
      password: regularAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Submit admin request as this customer
  await authorize_admin_join(regularAdminCandidateConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // NOTE: In a complete system, super admin would approve this request
  // For this test, we'll simulate a regular admin by logging in directly
  // This assumes there's a mechanism to create regular admins (e.g., through seed data)
  // 5. Authenticate as regular admin
  // In a real test environment, there would be a way to have an approved regular admin
  // For this test, we attempt to login as admin with the credentials above
  const regularAdminConnection: api.IConnection = { host: connection.host };
  let regularAdminLoggedIn = false;
  try {
    await authorize_admin_login(regularAdminConnection, {
      body: {
        email: regularAdminEmail,
        password: regularAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.ILogin,
    });
    regularAdminLoggedIn = true;
  } catch {
    // If login fails, admin account doesn't exist (request not approved)
    // This is expected behavior - test requires a pre-existing regular admin
    TestValidator.predicate(
      "Test requires pre-existing regular admin account for 403 testing",
      false,
    );
    return;
  }
  // 6. Generate a test requestId (valid UUID format)
  const testRequestId = typia.random<string & tags.Format<"uuid">>();
  // 7. Verify 403 Forbidden when regular admin attempts to access admin request details
  await TestValidator.httpError(
    "Regular administrator receives 403 Forbidden when accessing admin request details",
    403,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.requests.at(
        regularAdminConnection,
        {
          requestId: testRequestId,
        },
      ),
  );
}