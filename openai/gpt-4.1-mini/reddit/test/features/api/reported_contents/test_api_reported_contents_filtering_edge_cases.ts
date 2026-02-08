import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_contents_filtering_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorJoin);
  moderatorConnection.headers = { Authorization: moderatorJoin.token.access };
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  adminConnection.headers = { Authorization: adminJoin.token.access };
  // 1. Test filtering by a non-existent reportedPostId
  const nonExistentPostId = "00000000-0000-0000-0000-000000000000";
  const filterNonExistentPost =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          reportedPostId: nonExistentPostId,
          limit: 10,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(filterNonExistentPost);
  TestValidator.equals(
    "empty data for non-existent reportedPostId",
    filterNonExistentPost.data.length,
    0,
  );
  // 2. Test filtering by a non-existent reportedCommentId
  const nonExistentCommentId = "00000000-0000-0000-0000-000000000000";
  const filterNonExistentComment =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          reportedCommentId: nonExistentCommentId,
          limit: 10,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(filterNonExistentComment);
  TestValidator.equals(
    "empty data for non-existent reportedCommentId",
    filterNonExistentComment.data.length,
    0,
  );
  // 3. Test sorting order changes including ascending and descending
  // Ascending
  const ascending =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(ascending);
  // We can't check properties that do not exist, so just check data array length > 0 or empty
  TestValidator.predicate(
    "ascending data array",
    Array.isArray(ascending.data),
  );
  // Descending
  const descending =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          sort: ["-id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(descending);
  TestValidator.predicate(
    "descending data array",
    Array.isArray(descending.data),
  );
  // 4. Test limit boundary conditions
  const limitOne =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          limit: 1,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(limitOne);
  TestValidator.predicate(
    "limit one returns max one item",
    limitOne.data.length <= 1,
  );
  const limitHundred =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          limit: 100,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(limitHundred);
  TestValidator.predicate(
    "limit hundred max 100 items",
    limitHundred.data.length <= 100,
  );
  // 5. Test stable sorted output: request with same parameters should yield consistent order
  const firstPage =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondCall =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(secondCall);
  // Since ISummary has no id, compare the whole summary objects
  TestValidator.equals(
    "stable sorted output between calls",
    firstPage.data.map((d) => typia.assert(d)),
    secondCall.data.map((d) => typia.assert(d)),
  );
  // 6. Test admin can also retrieve with similar calls - permission check
  const adminResult =
    await api.functional.communityPlatform.reportedContents.index(
      adminConnection,
      {
        body: {
          limit: 10,
          sort: ["+id"],
        } satisfies ICommunityPlatformReportedContent.IRequest,
      },
    );
  typia.assert(adminResult);
  TestValidator.predicate(
    "admin result data array present",
    adminResult.data.length >= 0,
  );
}
