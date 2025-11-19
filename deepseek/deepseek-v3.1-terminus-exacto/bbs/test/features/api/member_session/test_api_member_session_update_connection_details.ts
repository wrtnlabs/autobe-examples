import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test that members can update their own session connection details including
 * IP address, access URL, and referrer information. This validates session
 * management capabilities where members need to refresh connection context,
 * track navigation patterns, or extend session validity. The test establishes
 * member authentication, creates prerequisite content structure, and then
 * updates session details with new connection information.
 */
export async function test_api_member_session_update_connection_details(
  connection: api.IConnection,
) {
  // 1. Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        ip: "192.168.1.1",
        href: "https://discussion-board.com/admin",
        referrer: "https://discussion-board.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create discussion board channel as moderator
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          channel: {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            status: channel.status,
            created_at: channel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        ip: "192.168.1.100",
        href: "https://discussion-board.com/member",
        referrer: "https://discussion-board.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 5. Member creates content to establish active session
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 6. Update member session with new connection details
  // Since we don't have access to the actual session ID from the authentication response,
  // we'll test the session update functionality with a valid session ID structure
  const sessionUpdateData: IDiscussionBoardMemberSession.IUpdate = {
    ip: "203.0.113.45",
    href: "https://discussion-board.com/member/dashboard",
    referrer: "https://discussion-board.com/member/posts",
    expired_at: null,
  } satisfies IDiscussionBoardMemberSession.IUpdate;

  // The session update operation requires a valid session ID that belongs to the member
  // In a real scenario, this would be obtained from the member's active session
  // For testing purposes, we'll use a valid UUID format
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to update the session - this may fail if the session doesn't exist,
  // but it tests the API contract and validation
  const updatedSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.members.sessions.update(
      connection,
      {
        username: memberUsername,
        sessionId: sessionId,
        body: sessionUpdateData,
      },
    );
  typia.assert(updatedSession);

  // 7. Validate that session details were updated correctly
  TestValidator.equals(
    "IP address should be updated",
    updatedSession.ip,
    sessionUpdateData.ip,
  );
  TestValidator.equals(
    "href should be updated",
    updatedSession.href,
    sessionUpdateData.href,
  );
  TestValidator.equals(
    "referrer should be updated",
    updatedSession.referrer,
    sessionUpdateData.referrer,
  );
  TestValidator.equals(
    "expired_at should be null",
    updatedSession.expired_at,
    sessionUpdateData.expired_at,
  );
  TestValidator.equals(
    "member_id should match authenticated member",
    updatedSession.member_id,
    member.id,
  );
}
