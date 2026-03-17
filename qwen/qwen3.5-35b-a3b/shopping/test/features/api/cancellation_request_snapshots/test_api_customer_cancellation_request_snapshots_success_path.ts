import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_request_snapshots_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create authenticated connection with the token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customer.token.access,
    },
  };
  // 3. Query cancellation request snapshots with pagination
  const snapshotPage =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotPage.pagination.limit >= 1 && snapshotPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    snapshotPage.pagination.pages,
    snapshotPage.pagination.records === 0
      ? 0
      : Math.ceil(
          snapshotPage.pagination.records / snapshotPage.pagination.limit,
        ),
  );
  // 5. Validate snapshot data structure and content
  for (const snapshot of snapshotPage.data) {
    typia.assert(snapshot);
    // Verify required fields exist and have correct types
    TestValidator.predicate(
      "snapshot id is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      "cancellationRequestId is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.cancellationRequestId),
    );
    TestValidator.equals("actorType is seller", snapshot.actorType, "seller");
    TestValidator.equals(
      "action is approved or rejected",
      snapshot.action,
      "approved",
    );
    // Verify timestamp format
    const createdDate = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "createdAt is valid date",
      !isNaN(createdDate.getTime()),
    );
    const updatedDate = new Date(snapshot.updatedAt);
    TestValidator.predicate(
      "updatedAt is valid date",
      !isNaN(updatedDate.getTime()),
    );
  }
  // 6. Test second page pagination
  const snapshotPage2 =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      authenticatedConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage2);
  TestValidator.equals(
    "pagination current page on page 2",
    snapshotPage2.pagination.current,
    2,
  );
}
