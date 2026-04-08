import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_snapshot_filtering_by_requester_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Filter by 'member' requester type
  const memberSnapshots =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          requester_type: "member",
        },
      },
    );
  typia.assert(memberSnapshots);
  // Validate member filter results
  TestValidator.equals(
    "member filter pagination current",
    memberSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "member filter records count >= 0",
    memberSnapshots.pagination.records >= 0,
  );
  // Verify all returned snapshots have requester_type='member'
  const allMembers = memberSnapshots.data;
  for (const snapshot of allMembers) {
    const safeSnapshot =
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        snapshot,
      );
    TestValidator.equals(
      "snapshot requester_type is member",
      safeSnapshot.requester_type,
      "member",
    );
  }
  // Validate member snapshot structure
  if (allMembers.length > 0) {
    const sampleMember = allMembers[0];
    const safeSampleMember =
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        sampleMember,
      );
    TestValidator.equals(
      "member snapshot has requester_id",
      safeSampleMember.requester_id.length > 0,
      true,
    );
    TestValidator.equals(
      "member snapshot has request_reason",
      safeSampleMember.request_reason.length > 0,
      true,
    );
    TestValidator.equals(
      "member snapshot has approval_request",
      safeSampleMember.approval_request !== null,
      true,
    );
    TestValidator.equals(
      "member snapshot has reviewer",
      safeSampleMember.reviewer !== null,
      true,
    );
  }
  // 3. Filter by 'seller' requester type
  const sellerSnapshots =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          requester_type: "seller",
        },
      },
    );
  typia.assert(sellerSnapshots);
  // Validate seller filter results
  TestValidator.equals(
    "seller filter pagination current",
    sellerSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "seller filter records count >= 0",
    sellerSnapshots.pagination.records >= 0,
  );
  // Verify all returned snapshots have requester_type='seller'
  const allSellers = sellerSnapshots.data;
  for (const snapshot of allSellers) {
    const safeSnapshot =
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        snapshot,
      );
    TestValidator.equals(
      "snapshot requester_type is seller",
      safeSnapshot.requester_type,
      "seller",
    );
  }
  // Validate seller snapshot structure
  if (allSellers.length > 0) {
    const sampleSeller = allSellers[0];
    const safeSampleSeller =
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        sampleSeller,
      );
    TestValidator.equals(
      "seller snapshot has requester_id",
      safeSampleSeller.requester_id.length > 0,
      true,
    );
    TestValidator.equals(
      "seller snapshot has request_reason",
      safeSampleSeller.request_reason.length > 0,
      true,
    );
    TestValidator.equals(
      "seller snapshot has approval_request",
      safeSampleSeller.approval_request !== null,
      true,
    );
    TestValidator.equals(
      "seller snapshot has reviewer",
      safeSampleSeller.reviewer !== null,
      true,
    );
  }
  // 4. Verify filtering doesn't alter snapshot data (immutability)
  const allMembersHaveCorrectType = allMembers.every(
    (s) =>
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        s,
      ).requester_type === "member",
  );
  const allSellersHaveCorrectType = allSellers.every(
    (s) =>
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        s,
      ).requester_type === "seller",
  );
  TestValidator.predicate(
    "member snapshots maintain requester_type",
    allMembersHaveCorrectType,
  );
  TestValidator.predicate(
    "seller snapshots maintain requester_type",
    allSellersHaveCorrectType,
  );
  // 5. Validate approval_request references contain appropriate user IDs
  for (const member of allMembers) {
    const safeMember =
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        member,
      );
    const approvalRequest = safeMember.approval_request;
    typia.assert(approvalRequest);
    // Member request should have requesting_member_id
    TestValidator.equals(
      "member approval_request has requesting_member_id",
      approvalRequest.requesting_member_id !== undefined,
      true,
    );
  }
  for (const seller of allSellers) {
    const safeSeller =
      typia.assert<IEcommerceMallAdministratorApprovalRequestSnapshot.ISummary>(
        seller,
      );
    const approvalRequest = safeSeller.approval_request;
    typia.assert(approvalRequest);
    // Seller request should have requesting_seller_id
    TestValidator.equals(
      "seller approval_request has requesting_seller_id",
      approvalRequest.requesting_seller_id !== undefined,
      true,
    );
  }
}
