import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorAssignment";

/**
 * Validate admin's ability to list moderator assignments in a community.
 *
 * 1. Register and authenticate a new admin (join)
 * 2. Create a new community
 * 3. List moderator assignments for that community (should be empty initially)
 * 4. Validate response structure and pagination when there are no assignments
 * 5. Try unauthorized access with unauthenticated connection (should fail)
 * 6. Check pagination: use page=1, limit=20 (should reflect in response)
 * 7. Check filtering: search by wrong community_id (should get empty array)
 * 8. (Assuming no assignments exist) -- would verify with multiple if assignment
 *    creation is possible.
 */
export async function test_api_community_moderator_assignment_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = RandomGenerator.name(2).replace(/ /g, "") + "@admin.com";
  const adminJoinInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    superuser: true,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. As admin, list moderator assignments for the new community (expect empty)
  const listBody = {
    community_id: community.id,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    order_by: "created_at",
    order_dir: "desc",
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IRequest;
  const output: IPageICommunityPlatformCommunityModeratorAssignment.ISummary =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.index(
      connection,
      { communityId: community.id, body: listBody },
    );
  typia.assert(output);

  // 4. Validate output is for the right community and is empty
  TestValidator.equals(
    "no moderator assignments after community creation",
    output.data,
    [],
  );
  TestValidator.equals(
    "pagination default is correct",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    output.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination total records is zero for empty",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero for empty",
    output.pagination.pages,
    0,
  );

  // 5. Unauthorized: Try unauthenticated access (new clean connection instance)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized moderator listing blocked",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorAssignments.index(
        unauthConn,
        { communityId: community.id, body: listBody },
      );
    },
  );

  // 6. Filtering with random wrong community_id (should return zero)
  const wrongCommunityId = typia.random<string & tags.Format<"uuid">>();
  const wrongList =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.index(
      connection,
      {
        communityId: wrongCommunityId,
        body: { ...listBody, community_id: wrongCommunityId },
      },
    );
  typia.assert(wrongList);
  TestValidator.equals(
    "moderator assignments for wrong communityId is empty",
    wrongList.data,
    [],
  );
}
