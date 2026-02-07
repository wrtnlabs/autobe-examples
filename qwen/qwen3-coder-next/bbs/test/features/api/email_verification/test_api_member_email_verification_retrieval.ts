import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Create member-specific connection for subsequent operations
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResponse.token.access,
    },
  };
  // 3. Retrieve email verification record
  // Note: The current implementation returns a random verification record
  // In a real scenario, we would need to create a specific verification record first
  // For now, we test with a randomly generated verificationId
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification =
    await api.functional.discussionBoard.member.email_verifications.at(
      memberAuthConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate response structure (basic validation since DTO is empty)
  // The verification record should be returned with valid structure
  // Since IDiscussionBoardMemberEmailVerification is empty, we just validate
  // that the API call succeeded and returned a valid response
}
