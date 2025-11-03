import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_profile_retrieval_by_member(
  connection: api.IConnection,
) {
  // Create a new discussion board member via join
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Fetch the member profile by id
  const profile: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.member.discussionBoardMembers.at(
      connection,
      {
        discussionBoardMemberId: authorized.id,
      },
    );
  typia.assert(profile);

  // Validate profile fields against authorized info
  TestValidator.equals(
    "profile id matches authorized id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email matches created email",
    profile.email,
    createBody.email,
  );
}
