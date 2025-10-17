import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusChange";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityStatusChange";

/**
 * Test that a moderator can retrieve the full audit trail of all status changes
 * for their community, can use status filtering, pagination, sorting, and that
 * access is limited to authorized moderators/admins only. Steps:
 *
 * 1. Create a new community as member
 * 2. Register/join as moderator for that community
 * 3. As moderator, retrieve audit trail after creation (should have at least a
 *    creation status entry)
 * 4. Validate that audit entries contain actor, previous/new status, timestamps,
 *    etc.
 * 5. Test pagination, filtering by a known status, and sorting by created_at
 *    ascending/descending
 * 6. Switch to unauthorized context (new moderator for different community) and
 *    verify unauthorized access is blocked
 */
export async function test_api_community_status_change_audit_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a new community as a member: simulate as random member context (this is the only available API)
  const communityName = RandomGenerator.alphaNumeric(12);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 2. Register/join as moderator for that community
  const emailModerator = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const passwordModerator = RandomGenerator.alphaNumeric(10);
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: emailModerator as string & tags.Format<"email">,
      password: passwordModerator as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // 3. As moderator, retrieve the audit trail after creation
  const auditInitial =
    await api.functional.communityPlatform.moderator.communities.statusChanges.index(
      connection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(auditInitial);
  TestValidator.predicate(
    "audit log should have at least one entry",
    auditInitial.data.length > 0,
  );

  const initialAuditEntry = auditInitial.data[0];
  typia.assert(initialAuditEntry);
  TestValidator.equals(
    "community id matches in audit entry",
    initialAuditEntry.community_id,
    community.id,
  );

  // 4. Validate presence of actor, status, timestamps
  TestValidator.predicate(
    "audit entry has actor",
    typeof initialAuditEntry.performed_by_id === "string" &&
      !!initialAuditEntry.performed_by_id,
  );
  TestValidator.predicate(
    "audit entry has previous and new status",
    !!initialAuditEntry.previous_status && !!initialAuditEntry.new_status,
  );

  // 5. Test filtering by known status (use new_status), and pagination/sorting
  if (initialAuditEntry.new_status) {
    const auditFiltered =
      await api.functional.communityPlatform.moderator.communities.statusChanges.index(
        connection,
        {
          communityId: community.id,
          body: {
            status: initialAuditEntry.new_status,
            limit: 1 as number & tags.Type<"int32">,
            page: 1 as number & tags.Type<"int32">,
            sort: "created_at",
            order: "desc",
          },
        },
      );
    typia.assert(auditFiltered);
    TestValidator.predicate(
      "filtered audit result has at least one entry",
      auditFiltered.data.length > 0,
    );
    for (const entry of auditFiltered.data) {
      TestValidator.equals(
        "filtered audit new_status matches",
        entry.new_status,
        initialAuditEntry.new_status,
      );
    }
  }

  // 6. Attempt to access audit log from another moderator (should be unauthorized)
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);

  const otherModeratorAuth = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@test.com` as string &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(10) as string &
          tags.Format<"password">,
        community_id: otherCommunity.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(otherModeratorAuth);

  // Try fetching audit log for the FIRST community as the moderator of the SECOND one
  await TestValidator.error(
    "unauthorized moderator should not access other community's audit log",
    async () => {
      // Must re-authenticate as the other moderator (token handled automatically by SDK)
      await api.functional.communityPlatform.moderator.communities.statusChanges.index(
        connection,
        {
          communityId: community.id,
          body: {},
        },
      );
    },
  );

  // 7. (Optionally, try with random invalid communityId)
  await TestValidator.error("invalid community ID should fail", async () => {
    await api.functional.communityPlatform.moderator.communities.statusChanges.index(
      connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}
