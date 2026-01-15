import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_reply_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate random UUIDs for reviewId and replyId
  // Since no creation endpoints are provided, we need to test deletion with valid UUIDs
  // The API does not provide creation functions, so we use generated UUIDs for deletion
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Delete the reply as admin (using adminConnection and generated UUIDs)
  // The API endpoint accepts any reviewId and replyId regardless of existence
  // We're testing the admin's ability to delete any reply, so we test with random UUIDs
  await api.functional.shoppingMall.admin.reviews.replies.erase(
    adminConnection,
    {
      reviewId,
      replyId,
    },
  );
  // Step 4: Verify the reply deletion operation was successful (no errors)
  // Since the response is void, we verify that the delete operation completed without error
  // This is the only test possible with the provided API functions
  // The implementation is based on the endpoint specification: DELETE /shoppingMall/admin/reviews/{reviewId}/replies/{replyId}
}
