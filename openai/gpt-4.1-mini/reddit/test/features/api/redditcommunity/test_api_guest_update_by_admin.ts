import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_guest_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass!234",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user login to refresh the auth token
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass!234",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Member user joins to create a community (prerequisite)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass!123",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 4. Member login to refresh token
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass!123",
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 5. Member creates a new community
  const communityName = RandomGenerator.name(1)
    .replace(/\s/g, "_")
    .toLowerCase()
    .substring(0, 50);
  const communityDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 7,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Admin updates a redditCommunityGuest entity by ID
  // Generate guest ID and create a realistic IPv4 address string
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const newSessionId = RandomGenerator.alphaNumeric(32);
  const randomOctet = () => Math.floor(Math.random() * 256);
  const newIpAddress = `${randomOctet()}.${randomOctet()}.${randomOctet()}.${randomOctet()}`;
  const newUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

  const updatedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.admin.redditCommunityGuests.update(
      connection,
      {
        id: guestId,
        body: {
          session_id: newSessionId,
          ip_address: newIpAddress,
          user_agent: newUserAgent,
        } satisfies IRedditCommunityGuest.IUpdate,
      },
    );
  typia.assert(updatedGuest);

  TestValidator.equals(
    "updated guest session id matches",
    updatedGuest.session_id,
    newSessionId,
  );
  TestValidator.equals(
    "updated guest ip address matches",
    updatedGuest.ip_address,
    newIpAddress,
  );
  TestValidator.equals(
    "updated guest user agent matches",
    updatedGuest.user_agent,
    newUserAgent,
  );
}
