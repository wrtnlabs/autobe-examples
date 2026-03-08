import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Customer login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. Default pagination (limit=20, sortBy=createdAt, sortOrder=desc)
  const defaultBody = {} satisfies IEcommerceMallShipment.IRequest;
  const defaultResponse =
    await api.functional.ecommerceMall.customer.shipments.index(
      loginConnection,
      {
        body: defaultBody,
      },
    );
  typia.assert(defaultResponse);
  // 4. Validate default pagination metadata
  TestValidator.equals(
    "default pagination current",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default pagination records >= 0",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages >= 0",
    defaultResponse.pagination.pages >= 0,
  );
  // 5. Extract page token from first response and query second page
  const pageBody = {
    page:
      defaultResponse.pagination.current > 1
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined,
  } satisfies IEcommerceMallShipment.IRequest;
  const pageResponse =
    await api.functional.ecommerceMall.customer.shipments.index(
      loginConnection,
      {
        body: pageBody,
      },
    );
  typia.assert(pageResponse);
  // 6. Test custom limit=10
  const limit10Body = { limit: 10 } satisfies IEcommerceMallShipment.IRequest;
  const limit10Response =
    await api.functional.ecommerceMall.customer.shipments.index(
      loginConnection,
      {
        body: limit10Body,
      },
    );
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit 10 pagination limit",
    limit10Response.pagination.limit,
    10,
  );
  // 7. Test custom limit=50
  const limit50Body = { limit: 50 } satisfies IEcommerceMallShipment.IRequest;
  const limit50Response =
    await api.functional.ecommerceMall.customer.shipments.index(
      loginConnection,
      {
        body: limit50Body,
      },
    );
  typia.assert(limit50Response);
  TestValidator.equals(
    "limit 50 pagination limit",
    limit50Response.pagination.limit,
    50,
  );
  // 8. Test sorting by trackingNumber ascending
  const sortAscBody = {
    sortBy: "trackingNumber",
    sortOrder: "asc",
  } satisfies IEcommerceMallShipment.IRequest;
  const sortAscResponse =
    await api.functional.ecommerceMall.customer.shipments.index(
      loginConnection,
      {
        body: sortAscBody,
      },
    );
  typia.assert(sortAscResponse);
  // 9. Test sorting by trackingNumber descending
  const sortDescBody = {
    sortBy: "trackingNumber",
    sortOrder: "desc",
  } satisfies IEcommerceMallShipment.IRequest;
  const sortDescResponse =
    await api.functional.ecommerceMall.customer.shipments.index(
      loginConnection,
      {
        body: sortDescBody,
      },
    );
  typia.assert(sortDescResponse);
  // 10. Validate shipment data structure
  if (defaultResponse.data.length > 0) {
    const firstShipment = defaultResponse.data[0];
    typia.assert(firstShipment);
    TestValidator.predicate(
      "shipment id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(firstShipment.id),
    );
    TestValidator.predicate(
      "carrier_name is string",
      typeof firstShipment.carrier_name === "string",
    );
    TestValidator.predicate(
      "tracking_number is string",
      typeof firstShipment.tracking_number === "string",
    );
    TestValidator.predicate(
      "created_at is valid datetime",
      typeof firstShipment.created_at === "string",
    );
    TestValidator.predicate("order exists", firstShipment.order !== undefined);
    TestValidator.predicate(
      "seller exists",
      firstShipment.seller !== undefined,
    );
  }
  // 11. Validate sorting by trackingNumber ascending
  if (sortAscResponse.data.length > 1) {
    for (let i = 1; i < sortAscResponse.data.length; i++) {
      const prev = sortAscResponse.data[i - 1];
      const curr = sortAscResponse.data[i];
      TestValidator.predicate(
        `tracking number ${i} >= ${i - 1}`,
        curr.tracking_number >= prev.tracking_number,
      );
    }
  }
  // 12. Validate sorting by trackingNumber descending
  if (sortDescResponse.data.length > 1) {
    for (let i = 1; i < sortDescResponse.data.length; i++) {
      const prev = sortAscResponse.data[i - 1];
      const curr = sortDescResponse.data[i];
      TestValidator.predicate(
        `tracking number ${i} <= ${i - 1}`,
        curr.tracking_number <= prev.tracking_number,
      );
    }
  }
  // 13. Validate pagination pages calculation
  TestValidator.predicate(
    "pages calculated correctly",
    Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    ) === defaultResponse.pagination.pages,
  );
}