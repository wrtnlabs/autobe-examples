import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import { prepare_random_community_platform_sales_order_note } from "../../../prepare/prepare_random_community_platform_sales_order_note";
import { generate_random_community_platform_admin_salesordernotes_create } from "../../../generate/generate_random_community_platform_admin_salesordernotes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_order_note_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to gain deletion privileges
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a sales order note to be deleted in the test scenario
  // Use the admin connection to create the note
  const orderNote =
    await generate_random_community_platform_admin_salesordernotes_create(
      adminConnection,
      {
        body: {
          order_id: typia.random<string & tags.Format<"uuid">>(),
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformSalesOrderNote.ICreate,
      },
    );
  typia.assert(orderNote);
  // Step 3: Delete the sales order note using the target operation
  // Use adminConnection for deletion (authorized admin)
  await api.functional.communityPlatform.admin.salesordernotes.erase(
    adminConnection,
    {
      noteId: orderNote.note_id,
    },
  );
  // Validation: Note should be permanently deleted. No response is expected.
  // Since the endpoint returns void, no typia.assert is needed.
}
