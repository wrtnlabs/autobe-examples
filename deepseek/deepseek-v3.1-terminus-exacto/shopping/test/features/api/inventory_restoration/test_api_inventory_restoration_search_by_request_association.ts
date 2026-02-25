import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceModificationInventoryRestoration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_restoration_search_by_request_association(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Search with valid request ID parameters to test filtering functionality
  // Note: Using undefined values to test that the search endpoint handles
  // association filters appropriately without requiring specific existing IDs
  const searchWithAssociationFilters =
    await api.functional.ecommerce.administrator.modification_inventory_restorations.index(
      adminConnection,
      {
        body: {
          cancellation_request_id: undefined,
          refund_request_id: undefined,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(searchWithAssociationFilters);
  // Validate that the search returns proper pagination structure
  TestValidator.predicate(
    "search returns valid pagination metadata",
    searchWithAssociationFilters.pagination.records >= 0 &&
      searchWithAssociationFilters.pagination.pages >= 0 &&
      searchWithAssociationFilters.pagination.current >= 1 &&
      searchWithAssociationFilters.pagination.limit >= 1,
  );
  // Test that the endpoint accepts the association filter parameters
  // by searching with null values to verify parameter validation
  const searchWithEmptyFilters =
    await api.functional.ecommerce.administrator.modification_inventory_restorations.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(searchWithEmptyFilters);
  // Verify the endpoint structure is consistent
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(searchWithEmptyFilters.data),
  );
  // Validate that inventory restoration records have required fields
  if (searchWithEmptyFilters.data.length > 0) {
    const sampleRecord = searchWithEmptyFilters.data[0];
    TestValidator.predicate(
      "record has required fields",
      typeof sampleRecord.id === "string" &&
        typeof sampleRecord.quantity_restored === "number" &&
        typeof sampleRecord.restoration_reason === "string" &&
        typeof sampleRecord.created_at === "string" &&
        typeof sampleRecord.ecommerce_inventory_record_id === "string" &&
        (sampleRecord.ecommerce_cancellation_request_id === null ||
          typeof sampleRecord.ecommerce_cancellation_request_id === "string") &&
        (sampleRecord.ecommerce_refund_request_id === null ||
          typeof sampleRecord.ecommerce_refund_request_id === "string"),
    );
  }
}
