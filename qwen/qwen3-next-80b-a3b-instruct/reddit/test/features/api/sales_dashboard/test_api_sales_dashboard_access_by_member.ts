import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSalesDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesDashboard";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sales_dashboard_access_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as member using the provided utility function
  // Generate realistic member credentials using RandomGenerator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberHref = `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`;
  const memberReferrer = `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`;
  // Use the authorize_member_join utility function to authenticate
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Access the sales dashboard endpoint using the authenticated connection
  // The endpoint returns an ICommunityPlatformSalesDashboard object with all calculated metrics
  const salesDashboard: ICommunityPlatformSalesDashboard =
    await api.functional.communityPlatform.member.analytics.sales.dashboard.index(
      memberConnection,
    );
  typia.assert(salesDashboard);
}
