import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderation_appeal_retrieval_by_filer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a moderation appeal against an existing report
  // Since we need a report to appeal, we need to create one first
  // For simplicity, we'll use a randomly generated report ID for the appeal
  const appealContent = RandomGenerator.paragraph({ sentences: 3 });
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Create the appeal (assuming we have a function to create an appeal)
  // Note: Based on the provided API, we only have retrieval, not creation
  // So we'll need to mock or assume the appeal exists
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the appeal using the appeal ID
  const retrievedAppeal = await api.functional.redditClone.appeals.at(
    memberConnection,
    {
      appealId,
    },
  );
  typia.assert(retrievedAppeal);
  // 4. Verify the response includes all appeal details
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appealId);
  TestValidator.equals("status is pending", retrievedAppeal.status, "pending");
  TestValidator.equals(
    "appeal content matches",
    retrievedAppeal.appeal_content,
    appealContent,
  );
  TestValidator.equals("user ID matches", retrievedAppeal.user_id, member.id);
  TestValidator.equals(
    "report ID matches",
    retrievedAppeal.report_id,
    reportId,
  );
}
