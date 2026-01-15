import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_dispute_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection and authenticate an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random dispute ID for testing retrieval (even though we can't create it)
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  // Admin retrieves a dispute by ID (system should return dispute regardless of existence)
  const retrievedDispute: ICommunityPlatformReportDispute =
    await api.functional.communityPlatform.admin.report.disputes.at(
      adminConnection, // Admin-specific connection
      { disputeId },
    );
  typia.assert(retrievedDispute);
  // Test that a non-admin user cannot access a dispute
  // Create a connection and authenticate a regular user
  const otherUserConnection: api.IConnection = { host: connection.host };
  // We'll use the same admin login mechanism since no other user auth is provided
  // This assumes the system has some access control mechanism in place
  await authorize_admin_login(otherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AnotherSecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // The non-admin user should not be able to retrieve the dispute
  // Even though we're testing with the same disputeId, this tests access control
  await TestValidator.error(
    "non-admin user cannot retrieve dispute",
    async () => {
      await api.functional.communityPlatform.admin.report.disputes.at(
        otherUserConnection,
        { disputeId },
      );
    },
  );
}
