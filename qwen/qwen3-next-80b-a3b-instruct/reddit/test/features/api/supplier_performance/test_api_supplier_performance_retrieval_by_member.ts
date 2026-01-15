import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventorySupplierPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySupplierPerformance";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_supplier_performance_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Create new connection for authenticated user
  const authenticatedConnection: api.IConnection = {
    host: memberConnection.host,
  };
  // The headers are automatically updated by authorize_member_join so we can reuse
  // the same connection object that was passed to it, for clarity.
  // Fetch supplier performance data
  const supplierPerformance: ICommunityPlatformInventorySupplierPerformance =
    await api.functional.communityPlatform.member.inventory.suppliers.performance.index(
      memberConnection,
    );
  // Validate data integrity - typia.assert provides complete validation
  typia.assert(supplierPerformance);
  // Test unauthorized access - create fresh connection without auth
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated user receives 401", async () => {
    await api.functional.communityPlatform.member.inventory.suppliers.performance.index(
      guestConnection,
    );
  });
}
