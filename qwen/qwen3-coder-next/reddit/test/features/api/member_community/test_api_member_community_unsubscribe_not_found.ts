import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommon";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_community_unsubscribe_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member to establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberProfile);
  // Step 2: Attempt to unsubscribe from a non-existent community
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  // The unsubscribe operation should succeed even for non-existent subscriptions (idempotent)
  // or return appropriate error indicating the subscription doesn't exist
  try {
    const result =
      await api.functional.redditPlatform.member.communities.subscriptions.erase(
        memberConnection,
        {
          communityId: fakeCommunityId,
        },
      );
    typia.assert(result);
    // If operation succeeds, verify it's a valid message response
    TestValidator.equals(
      "unsubscribing from non-existent community returns message",
      typeof result.message,
      "string",
    );
  } catch (error) {
    // If operation fails, verify it's an appropriate error
    if (error instanceof Error && "status" in error && typeof (error as any).status === "number") {
      TestValidator.predicate(
        "unsubscribing from non-existent community returns client error",
        () => (error as any).status >= 400 && (error as any).status < 500,
      );
    } else {
      throw error;
    }
  }
}