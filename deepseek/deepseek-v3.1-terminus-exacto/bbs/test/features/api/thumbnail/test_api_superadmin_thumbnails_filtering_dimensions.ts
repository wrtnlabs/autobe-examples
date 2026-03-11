import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_thumbnails_filtering_dimensions(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic dimensional filtering with valid ranges
  const widthMin1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100>
  >();
  const widthMax1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<1000>
  >();
  const heightMin1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100>
  >();
  const heightMax1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<1000>
  >();
  const basicFilterResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          width_min: widthMin1,
          width_max: widthMax1,
          height_min: heightMin1,
          height_max: heightMax1,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(basicFilterResponse);
  // Validate all thumbnails meet dimensional criteria
  for (const thumbnail of basicFilterResponse.data) {
    TestValidator.predicate(
      "thumbnail width within range",
      thumbnail.width >= widthMin1 && thumbnail.width <= widthMax1,
    );
    TestValidator.predicate(
      "thumbnail height within range",
      thumbnail.height >= heightMin1 && thumbnail.height <= heightMax1,
    );
  }
  // Test 2: Dimensional filtering with size category
  const sizeCategoryResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          size_category: "medium" as const,
          width_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<200>
          >(),
          width_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<600> & tags.Maximum<800>
          >(),
          height_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<200>
          >(),
          height_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<600> & tags.Maximum<800>
          >(),
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(sizeCategoryResponse);
  // Test 3: Dimensional sorting - width ascending
  const widthAscResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          sort: "width:asc" as const,
          width_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50>
          >(),
          width_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<300> & tags.Maximum<500>
          >(),
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(widthAscResponse);
  // Validate width ascending order
  if (widthAscResponse.data.length > 1) {
    for (let i = 1; i < widthAscResponse.data.length; i++) {
      TestValidator.predicate(
        "width sorted ascending",
        widthAscResponse.data[i - 1].width <= widthAscResponse.data[i].width,
      );
    }
  }
  // Test 4: Dimensional sorting - height descending
  const heightDescResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          sort: "height:desc" as const,
          height_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50>
          >(),
          height_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<300> & tags.Maximum<500>
          >(),
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(heightDescResponse);
  // Validate height descending order
  if (heightDescResponse.data.length > 1) {
    for (let i = 1; i < heightDescResponse.data.length; i++) {
      TestValidator.predicate(
        "height sorted descending",
        heightDescResponse.data[i - 1].height >=
          heightDescResponse.data[i].height,
      );
    }
  }
  // Test 5: Edge case - width_min > width_max (should return empty results)
  const invalidRangeResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          width_min: 1000,
          width_max: 500,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(invalidRangeResponse);
  TestValidator.equals(
    "invalid range returns empty results",
    invalidRangeResponse.data.length,
    0,
  );
  // Test 6: Extreme dimensional values
  const extremeDimensionsResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          width_min: 10000,
          height_min: 10000,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(extremeDimensionsResponse);
  // Test 7: Pagination with dimensional filtering
  const paginatedResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          width_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          width_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<1000>
          >(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResponse.data.length <= 5,
  );
  // Test 8: Combined filtering with date range and dimensions
  const combinedResponse =
    await api.functional.discussionBoard.superAdmin.thumbnails.index(
      superAdminConnection,
      {
        body: {
          width_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<200>
          >(),
          height_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<200>
          >(),
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(combinedResponse);
}
