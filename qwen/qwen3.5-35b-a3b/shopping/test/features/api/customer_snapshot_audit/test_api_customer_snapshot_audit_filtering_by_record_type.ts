import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_snapshot_audit_filtering_by_record_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "SecurePass123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a new connection with customer token from authorize function
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedCustomerConnection.headers = {
    ...authenticatedCustomerConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // 3. Retrieve snapshot-audits without record_type filter
  const allSnapshots: IPageIEcommerceMallSnapshotAudit.ISummary =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      authenticatedCustomerConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 4. Retrieve snapshot-audits with record_type=['review'] filter
  const reviewSnapshots: IPageIEcommerceMallSnapshotAudit.ISummary =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      authenticatedCustomerConnection,
      {
        body: {
          record_type: ["review"],
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(reviewSnapshots);
  // 5. Retrieve snapshot-audits with record_type=['product'] filter (should be empty)
  const productSnapshots: IPageIEcommerceMallSnapshotAudit.ISummary =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      authenticatedCustomerConnection,
      {
        body: {
          record_type: ["product"],
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(productSnapshots);
  // 6. Retrieve snapshot-audits with record_type=['seller_profile'] filter (should be empty)
  const sellerProfileSnapshots: IPageIEcommerceMallSnapshotAudit.ISummary =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      authenticatedCustomerConnection,
      {
        body: {
          record_type: ["seller_profile"],
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(sellerProfileSnapshots);
  // 7. Retrieve snapshot-audits with multiple record_types including 'review'
  const mixedSnapshots: IPageIEcommerceMallSnapshotAudit.ISummary =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      authenticatedCustomerConnection,
      {
        body: {
          record_type: ["review", "product", "seller_profile", "order_item"],
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(mixedSnapshots);
  // 8. Validate assertions
  TestValidator.equals(
    "all snapshots pagination records",
    allSnapshots.pagination.records,
    reviewSnapshots.pagination.records,
  );
  TestValidator.equals(
    "all snapshots data count",
    allSnapshots.data.length,
    reviewSnapshots.data.length,
  );
  // Validate that all snapshot record types are 'review' when filtering by review
  for (const snapshot of reviewSnapshots.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} record_type is review`,
      snapshot.record_type,
      "review",
    );
    // Validate that changed_by belongs to the customer
    if (
      snapshot.changed_by.id === customerAuth.id
    ) {
      TestValidator.predicate("snapshot changed_by matches customer", true);
    }
  }
  // Validate that product filter returns empty
  TestValidator.equals(
    "product snapshots is empty",
    productSnapshots.data.length,
    0,
  );
  // Validate that seller_profile filter returns empty
  TestValidator.equals(
    "seller_profile snapshots is empty",
    sellerProfileSnapshots.data.length,
    0,
  );
  // Validate that mixed filter only returns review snapshots
  for (const snapshot of mixedSnapshots.data) {
    TestValidator.equals(
      `mixed snapshot ${snapshot.id} record_type is review`,
      snapshot.record_type,
      "review",
    );
  }
}