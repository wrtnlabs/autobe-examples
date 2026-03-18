import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_branch_sorting_and_thread_preservation(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(guest);
  const request = {
    page: 1,
    limit: 20,
    sort: "new",
  } satisfies ICommunityPlatformComment.IRequest;
  const newPage = await api.functional.communityPlatform.guest.comments.index(
    guestConnection,
    {
      body: request,
    },
  );
  typia.assert(newPage);
  const bestPage = await api.functional.communityPlatform.guest.comments.index(
    guestConnection,
    {
      body: {
        ...request,
        sort: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(bestPage);
  const controversialPage =
    await api.functional.communityPlatform.guest.comments.index(
      guestConnection,
      {
        body: {
          ...request,
          sort: "controversial",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialPage);
  TestValidator.equals("new pagination current", newPage.pagination.current, 1);
  TestValidator.equals(
    "best pagination current",
    bestPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "controversial pagination current",
    controversialPage.pagination.current,
    1,
  );
  TestValidator.equals("new pagination limit", newPage.pagination.limit, 20);
  TestValidator.equals("best pagination limit", bestPage.pagination.limit, 20);
  TestValidator.equals(
    "controversial pagination limit",
    controversialPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "new pagination records",
    newPage.pagination.records,
    bestPage.pagination.records,
  );
  TestValidator.equals(
    "best pagination records",
    bestPage.pagination.records,
    controversialPage.pagination.records,
  );
  TestValidator.equals(
    "new pagination pages",
    newPage.pagination.pages,
    bestPage.pagination.pages,
  );
  TestValidator.equals(
    "best pagination pages",
    bestPage.pagination.pages,
    controversialPage.pagination.pages,
  );
  const validateBranch = (
    page: IPageICommunityPlatformComment.ISummary,
  ): void => {
    for (const comment of page.data) {
      TestValidator.predicate("comment id exists", comment.id.length > 0);
      TestValidator.predicate(
        "comment post id exists",
        comment.community_platform_post_id.length > 0,
      );
      TestValidator.predicate(
        "comment author id exists",
        comment.community_platform_member_id.length > 0,
      );
      TestValidator.predicate(
        "comment content exists",
        comment.content.length > 0,
      );
      TestValidator.predicate(
        "comment timestamps are present",
        comment.created_at.length > 0 && comment.updated_at.length > 0,
      );
      TestValidator.equals(
        "branch comments remain active",
        comment.deleted_at,
        null,
      );
      if (comment.parent_id !== null) {
        TestValidator.predicate(
          "reply keeps its parent linkage",
          comment.parent_id.length > 0,
        );
      }
    }
  };
  validateBranch(newPage);
  validateBranch(bestPage);
  validateBranch(controversialPage);
  TestValidator.equals(
    "new and best preserve branch size",
    newPage.data.length,
    bestPage.data.length,
  );
  TestValidator.equals(
    "best and controversial preserve branch size",
    bestPage.data.length,
    controversialPage.data.length,
  );
  const sameThreadShape = (
    left: IPageICommunityPlatformComment.ISummary,
    right: IPageICommunityPlatformComment.ISummary,
  ): boolean =>
    left.data.length === right.data.length &&
    left.data.every((comment, index) => {
      const other = right.data[index];
      return (
        comment.community_platform_post_id ===
          other.community_platform_post_id &&
        comment.parent_id === other.parent_id &&
        comment.deleted_at === other.deleted_at
      );
    });
  TestValidator.predicate(
    "new and best preserve the same thread shape",
    sameThreadShape(newPage, bestPage),
  );
  TestValidator.predicate(
    "best and controversial preserve the same thread shape",
    sameThreadShape(bestPage, controversialPage),
  );
}
