import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_customer_admin_request_duplicate_pending_prevention(
  connection: api.IConnection,
): Promise<void> {} // 1. Customer registration setup const customerConnection: api.IConnection = { host: connection.host }; const customer = await authorize_customer_join(customerConnection, { body: { email: typia.random<string & tags.Format<"email">>(), password: RandomGenerator.alphaNumeric(16), href: typia.random<string & tags.Format<"uri">>(), referrer: typia.random<string & tags.Format<"uri">(), } satisfies IEcommerceMallCustomer.IJoin, }); typia.assert(customer); // 2. Submit first admin request using customer connection (already authorized) const firstRequest = await api.functional.ecommerceMall.customer.admin_requests.create( customerConnection, { body: { reason: "Need admin for platform management", } satisfies IEcommerceMallAdminRequestRequest.ICreate, }, ); typia.assert(firstRequest); // 3. Verify first request has pending status TestValidator.equals( "first request status", firstRequest.request_status, "pending", ); const firstRequestId = firstRequest.id; // 4. Attempt second admin request (should be rejected due to pending request existing) await TestValidator.error( "duplicate pending request should be rejected", async () => { await api.functional.ecommerceMall.customer.admin_requests.create( customerConnection, { body: { reason: "Need admin for different purpose", } satisfies IEcommerceMallAdminRequestRequest.ICreate, }, ); }, ); // 5. Third attempt with different reason to further validate duplicate prevention await TestValidator.error( "system consistently prevents duplicate pending admin requests", async () => { await api.functional.ecommerceMall.customer.admin_requests.create( customerConnection, { body: { reason: "Another reason for duplicate test", } satisfies IEcommerceMallAdminRequestRequest.ICreate, }, ); }, ); }
