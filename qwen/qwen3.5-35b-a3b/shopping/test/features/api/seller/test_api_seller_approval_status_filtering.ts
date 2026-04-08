import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_approval_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const allSellers = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(allSellers);
  const pendingSellers = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(pendingSellers);
  const approvedSellers = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "approved",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(approvedSellers);
  const rejectedSellers = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "rejected",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(rejectedSellers);
  TestValidator.predicate(
    "pending status all pending",
    pendingSellers.data.every((s) => s.approval_status === "pending"),
  );
  TestValidator.predicate(
    "approved status all approved",
    approvedSellers.data.every((s) => s.approval_status === "approved"),
  );
  TestValidator.predicate(
    "rejected status all rejected",
    rejectedSellers.data.every((s) => s.approval_status === "rejected"),
  );
  if (rejectedSellers.data.length > 0) {
    const rejectedWithReason = rejectedSellers.data.filter(
      (s) => s.rejection_reason !== null && s.rejection_reason !== undefined,
    );
    TestValidator.equals(
      "rejected sellers have rejection reason",
      rejectedWithReason.length,
      rejectedSellers.data.length,
    );
  }
  const suspendedApproved = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "approved",
        is_suspended: true,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(suspendedApproved);
  TestValidator.predicate(
    "suspended approved all suspended",
    suspendedApproved.data.every((s) => s.is_suspended === true),
  );
  TestValidator.predicate(
    "pending pagination has records",
    pendingSellers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved pagination has records",
    approvedSellers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "rejected pagination has records",
    rejectedSellers.pagination.records >= 0,
  );
  if (approvedSellers.pagination.pages > 1) {
    const page2 = await api.functional.ecommerceMall.sellers.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 pagination current",
      page2.pagination.current,
      2,
    );
  }
}
