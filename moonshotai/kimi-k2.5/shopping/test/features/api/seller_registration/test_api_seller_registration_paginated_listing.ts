import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrators retrieving a paginated list of seller registration applications.
 * Authenticates as admin and verifies the registration list endpoint returns proper
 * pagination structure and registration summaries with complete metadata.
 */
export async function test_api_seller_registration_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator to obtain JWT tokens
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // Step 2: Call the target endpoint with default pagination settings
  const response = await api.functional.ecommerceMall.admin.registrations.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSellerRegistration.IRequest,
    },
  );
  typia.assert(response);
}
