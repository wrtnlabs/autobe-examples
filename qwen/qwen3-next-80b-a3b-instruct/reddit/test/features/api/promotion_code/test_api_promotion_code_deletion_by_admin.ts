import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_promotion_code_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random promotion code (assuming it exists in the system)
  const promotionCode = typia.random<string>();
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated with token
  // Delete the promotion code
  const deletedPromotion: ICommunityPlatformPromotion =
    await api.functional.communityPlatform.admin.promotions.erase(
      adminConnection,
      {
        promotionCode,
      },
    );
  typia.assert(deletedPromotion);
  // Verify the returned object has required properties
  TestValidator.predicate(
    "promotion code is a non-empty string",
    () => deletedPromotion.code.length > 0,
  );
  TestValidator.predicate("promotion ID is a valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      deletedPromotion.id,
    ),
  );
  TestValidator.equals(
    "deleted promotion code matches request",
    deletedPromotion.code,
    promotionCode,
  );
}
