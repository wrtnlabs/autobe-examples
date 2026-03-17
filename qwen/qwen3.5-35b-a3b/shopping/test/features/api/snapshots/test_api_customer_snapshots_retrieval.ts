import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;
  // 2. Create actor-specific connection for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // 3. Test snapshots endpoint with default pagination parameters
  const defaultSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(defaultSnapshots);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "default pagination current page",
    defaultSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination records count",
    defaultSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "default pagination pages count",
    defaultSnapshots.pagination.pages,
    0,
  );
  // 5. Test snapshots endpoint with actor_id filter (customer's own snapshots)
  const actorFilteredSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          actor_id: customerId,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(actorFilteredSnapshots);
  // 6. Validate actor filtering works (should return 0 since no snapshots created)
  TestValidator.equals(
    "actor filtered snapshots count",
    actorFilteredSnapshots.pagination.records,
    0,
  );
  // 7. Test snapshots with specific entity_type filter
  const entityTypeFilterSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          entity_type: "product",
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(entityTypeFilterSnapshots);
  // 8. Test snapshots with version filter
  const versionFilterSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          version: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(versionFilterSnapshots);
  // 9. Test snapshots with pagination parameters
  const paginatedSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // 10. Test snapshots with created_at filters
  const createdAtAfter = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtBefore = new Date().toISOString();
  const dateRangeSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          created_at_after: createdAtAfter,
          created_at_before: createdAtBefore,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // 11. Validate snapshot summary structure
  typia.assert(paginatedSnapshots.data);
  paginatedSnapshots.data.forEach((snapshot) => {
    typia.assert(snapshot.entity_type);
    typia.assert(snapshot.entity_id);
    typia.assert(snapshot.version);
    typia.assert(snapshot.created_at);
  });
  // 12. Test sort parameter (descending order by default)
  const sortedSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(sortedSnapshots);
  // 13. Verify that customer can make API calls with other actor_id filter
  const anotherCustomerId = typia.random<string & tags.Format<"uuid">>();
  const otherActorSnapshots =
    await api.functional.ecommerceMall.customer.snapshots.index(
      authenticatedConnection,
      {
        body: {
          actor_id: anotherCustomerId,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(otherActorSnapshots);
}
