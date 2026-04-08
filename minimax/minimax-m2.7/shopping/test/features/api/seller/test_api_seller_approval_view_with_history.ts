import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving a specific seller approval record and verify the approvalHistory field contains all approval attempts.
 *
 * Validates the complete flow of retrieving detailed seller approval information including the full approval history array. The test verifies that when a seller retrieves their specific approval record by ID, the response includes the complete approvalHistory containing all approval attempts with proper field structure.
 *
 * The test follows this workflow:
 * 1. Register a new seller account to create an approval record
 * 2. Authenticate as the seller to obtain session credentials
 * 3. List approval records to obtain a valid approvalId
 * 4. Retrieve the specific approval record and validate its structure
 *
 * Key validations include verifying that the approvalHistory array is present with at least one record, each history item contains required fields (id, status, created_at, updated_at), seller references match the authenticated seller, and pending records have null reviewedByAdmin values.
 */
export async function test_api_seller_approval_view_with_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate via login
  const authenticatedConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(authenticatedConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. List approval records to obtain approvalId
  const approvalList =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.index(
      authenticatedConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalList);
  // 4. Get the first approvalId from the list
  TestValidator.predicate(
    "approval list should have data",
    approvalList.data.length > 0,
  );
  const approvalId = approvalList.data[0]!.id;
  // 5. Retrieve the specific approval record
  const approvalRecord =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.at(
      authenticatedConnection,
      {
        approvalId: approvalId,
      },
    );
  typia.assert(approvalRecord);
  // 6. Validations
  // approvalHistory array should be present and contain at least one record
  TestValidator.predicate(
    "approvalHistory should exist",
    approvalRecord.approvalHistory !== undefined,
  );
  TestValidator.predicate(
    "approvalHistory should have at least one record",
    approvalRecord.approvalHistory.length > 0,
  );
  // Validate each history item has required fields
  for (const historyItem of approvalRecord.approvalHistory) {
    TestValidator.predicate(
      "history item should have id",
      historyItem.id !== undefined && historyItem.id !== null,
    );
    TestValidator.predicate(
      "history item should have status",
      historyItem.status !== undefined && historyItem.status !== null,
    );
    TestValidator.predicate(
      "history item should have created_at",
      historyItem.created_at !== undefined && historyItem.created_at !== null,
    );
    TestValidator.predicate(
      "history item should have updated_at",
      historyItem.updated_at !== undefined && historyItem.updated_at !== null,
    );
    TestValidator.predicate(
      "history item should have seller reference",
      historyItem.seller !== undefined && historyItem.seller !== null,
    );
    // Seller reference should match the authenticated seller
    TestValidator.equals(
      "seller id should match",
      historyItem.seller.id,
      sellerAuth.id,
    );
    // For pending records, reviewedByAdmin should be null
    if (historyItem.status === "pending") {
      TestValidator.equals(
        "reviewedByAdmin should be null for pending",
        historyItem.reviewedByAdmin,
        null,
      );
    }
  }
}
