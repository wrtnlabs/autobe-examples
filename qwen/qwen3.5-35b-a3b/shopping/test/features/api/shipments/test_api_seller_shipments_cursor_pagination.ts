import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_seller_shipments_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller member
  const sellerConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create 25 shipments by simulating shipment creation
  // Since shipments.index is for listing, we simulate by making multiple calls
  // that would represent shipments created over time
  const allShipmentIds: string[] = [];
  // Simulate creating 25 shipments (in real scenario, these would be created via orders)
  await ArrayUtil.asyncRepeat(25, async (index) => {
    const shipmentResponse: IPageIEcommerceMallShipment.ISummary =
      await api.functional.ecommerceMall.member.shipments.index(
        sellerConnection,
        {
          body: {
            limit: 1,
            sort_direction: "DESC",
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(shipmentResponse);
    if (shipmentResponse.data.length > 0) {
      allShipmentIds.push(shipmentResponse.data[0].id);
    }
  });
  // 3. Test default pagination (limit=20)
  const page1Response: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.member.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 20,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate page 1 metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 20);
  TestValidator.equals("page 1 records", page1Response.pagination.records, 25);
  TestValidator.equals("page 1 pages", page1Response.pagination.pages, 2);
  TestValidator.predicate(
    "page 1 data length",
    page1Response.data.length === 20,
  );
  // 4. Test second page using cursor from page 1 (use last item's created_at or id)
  const page2Response: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.member.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          cursor: page1Response.data[19]?.id ?? null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate page 2 metadata
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 20);
  TestValidator.equals("page 2 records", page2Response.pagination.records, 25);
  TestValidator.equals("page 2 pages", page2Response.pagination.pages, 2);
  TestValidator.predicate(
    "page 2 data length",
    page2Response.data.length === 5,
  );
  // Verify no duplicates between pages using standard Set methods
  const page1Ids = new Set(page1Response.data.map((s) => s.id));
  const page2Ids = new Set(page2Response.data.map((s) => s.id));
  const duplicates = page2Response.data.filter((s) => page1Ids.has(s.id));
  TestValidator.equals("no duplicate IDs between pages", duplicates.length, 0);
  // 5. Test beyond available data (request cursor beyond last item)
  const pageBeyondResponse: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.member.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          cursor: "00000000-0000-0000-0000-000000000000",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(pageBeyondResponse);
  TestValidator.equals(
    "beyond page records",
    pageBeyondResponse.pagination.records,
    25,
  );
  TestValidator.equals(
    "beyond page data length",
    pageBeyondResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page pages",
    pageBeyondResponse.pagination.pages,
    2,
  );
  // 6. Test invalid cursor format (should return error)
  await TestValidator.error("invalid cursor format throws error", async () => {
    await api.functional.ecommerceMall.member.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          cursor: "invalid-cursor-format",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  });
  // 7. Test limit at maximum (100 items per page)
  const maxLimitResponse: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.member.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit records",
    maxLimitResponse.pagination.records,
    25,
  );
  TestValidator.equals(
    "max limit data length",
    maxLimitResponse.data.length,
    25,
  );
  TestValidator.equals("max limit pages", maxLimitResponse.pagination.pages, 1);
  // 8. Test limit at minimum (1 item per page)
  const minLimitResponse: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.member.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 1,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit records",
    minLimitResponse.pagination.records,
    25,
  );
  TestValidator.equals(
    "min limit data length",
    minLimitResponse.data.length,
    1,
  );
  TestValidator.equals(
    "min limit pages",
    minLimitResponse.pagination.pages,
    25,
  );
  // 9. Test cursor-based ordering consistency
  // First page should be newest (DESC by created_at)
  const firstShipmentDate = page1Response.data[0].created_at;
  const lastShipmentDate = page1Response.data[19].created_at;
  TestValidator.predicate(
    "first shipment newer than last shipment",
    new Date(firstShipmentDate) > new Date(lastShipmentDate),
  );
}
