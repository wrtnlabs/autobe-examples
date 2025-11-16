import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Tests that an admin can retrieve the details of a specific dispute message
 * entity by disputeId and messageId.
 *
 * 1. Register and authenticate as admin
 * 2. Synthesize minimal IShoppingMallCustomer.ISummary and
 *    IShoppingMallSeller.ISummary with typia.random to reference as
 *    customer/seller
 * 3. Create a new dispute with generated references and assign self as admin
 * 4. Post a dispute message with admin as sender, customer as receiver
 * 5. Retrieve the message by disputeId and messageId, validate returned fields and
 *    references
 * 6. Attempt retrieval with random non-existent ids, expecting error
 */
export async function test_api_admin_dispute_message_retrieval(
  connection: api.IConnection,
) {
  // 1. Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Minimal customer and seller summaries
  const customerSummary = typia.random<IShoppingMallCustomer.ISummary>();
  const sellerSummary = typia.random<IShoppingMallSeller.ISummary>();

  // 3. Create dispute
  const dispute = await api.functional.shoppingMall.admin.disputes.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerSummary.id,
        shopping_mall_seller_id: sellerSummary.id,
        shopping_mall_admin_id: admin.id,
        status: "open",
        subject: RandomGenerator.paragraph({ sentences: 2 }),
        root_cause: RandomGenerator.paragraph({ sentences: 2 }),
        resolution_note: null,
        shopping_mall_refund_request_id: null,
      },
    },
  );
  typia.assert(dispute);

  // 4. Post a message (admin sender, customer receiver)
  const msgBody = {
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 4,
    }),
    role: "admin",
    shopping_mall_sender_admin_id: admin.id,
    shopping_mall_sender_customer_id: null,
    shopping_mall_sender_seller_id: null,
    shopping_mall_receiver_admin_id: null,
    shopping_mall_receiver_customer_id: customerSummary.id,
    shopping_mall_receiver_seller_id: null,
  } satisfies IShoppingMallDisputeMessage.ICreate;
  const message =
    await api.functional.shoppingMall.admin.disputes.messages.create(
      connection,
      {
        disputeId: dispute.id,
        body: msgBody,
      },
    );
  typia.assert(message);

  // 5. Retrieve and validate
  const retrieved =
    await api.functional.shoppingMall.admin.disputes.messages.at(connection, {
      disputeId: dispute.id,
      disputeMessageId: message.id,
    });
  typia.assert(retrieved);
  TestValidator.equals("content matches", retrieved.content, msgBody.content);
  TestValidator.equals("role matches", retrieved.role, msgBody.role);
  TestValidator.equals(
    "sender_admin id correct",
    retrieved.sender_admin?.id,
    admin.id,
  );
  TestValidator.equals(
    "receiver_customer id correct",
    retrieved.receiver_customer?.id,
    customerSummary.id,
  );
  TestValidator.equals(
    "dispute linkage correct",
    retrieved.shopping_mall_dispute_id,
    dispute.id,
  );

  // 6. Non-existent id should error
  await TestValidator.error("not found error on bogus ids", async () => {
    await api.functional.shoppingMall.admin.disputes.messages.at(connection, {
      disputeId: typia.random<string & tags.Format<"uuid">>(),
      disputeMessageId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
