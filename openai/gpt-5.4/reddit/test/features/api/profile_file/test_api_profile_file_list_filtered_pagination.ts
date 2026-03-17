import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_profiles_files_create } from "../../../generate/generate_random_community_platform_member_profiles_files_create";
import { prepare_random_community_platform_profile_file } from "../../../prepare/prepare_random_community_platform_profile_file";

export async function test_api_profile_file_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const sharedCategory = "avatar";
  const fileA =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: {
          category: sharedCategory,
          original_name: "alpha-filter-target.png",
          extension: "png",
          mime_type: "image/png",
          size: 100,
          url: `https://example.com/${RandomGenerator.alphaNumeric(8)}-alpha.png`,
        } satisfies ICommunityPlatformProfileFile.ICreate,
      },
    );
  typia.assert(fileA);
  const fileB =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: {
          category: sharedCategory,
          original_name: "beta-filter-target.png",
          extension: "png",
          mime_type: "image/png",
          size: 200,
          url: `https://example.com/${RandomGenerator.alphaNumeric(8)}-beta.png`,
        } satisfies ICommunityPlatformProfileFile.ICreate,
      },
    );
  typia.assert(fileB);
  const fileC =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: {
          category: sharedCategory,
          original_name: "gamma-nonmatch.jpg",
          extension: "jpg",
          mime_type: "image/jpeg",
          size: 300,
          url: `https://example.com/${RandomGenerator.alphaNumeric(8)}-gamma.jpg`,
        } satisfies ICommunityPlatformProfileFile.ICreate,
      },
    );
  typia.assert(fileC);
  const firstPage =
    await api.functional.communityPlatform.member.profiles.files.index(
      memberConnection,
      {
        body: {
          category: sharedCategory,
          extension: "png",
          mime_type: "image/png",
          size_min: 100,
          size_max: 200,
          sort: "original_name+asc",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformProfileFile.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 1);
  TestValidator.equals(
    "first page filtered record count",
    firstPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "first page filtered page count",
    firstPage.pagination.pages,
    2,
  );
  TestValidator.equals("first page data length", firstPage.data.length, 1);
  TestValidator.equals(
    "first page first id ordered by original_name asc",
    firstPage.data[0]?.id,
    fileA.id,
  );
  TestValidator.equals(
    "first page category filter applied",
    firstPage.data[0]?.category,
    sharedCategory,
  );
  TestValidator.equals(
    "first page extension filter applied",
    firstPage.data[0]?.extension,
    "png",
  );
  TestValidator.equals(
    "first page mime type filter applied",
    firstPage.data[0]?.mime_type,
    "image/png",
  );
  TestValidator.equals(
    "first page original name sorted result",
    firstPage.data[0]?.original_name,
    "alpha-filter-target.png",
  );
  TestValidator.equals(
    "first page size lower bound match",
    firstPage.data[0]?.size,
    100,
  );
  TestValidator.predicate(
    "first page size within requested range",
    (firstPage.data[0]?.size ?? 0) >= 100 &&
      (firstPage.data[0]?.size ?? 0) <= 200,
  );
  TestValidator.equals(
    "first page excludes logically removed rows in ordinary results",
    firstPage.data[0]?.deleted_at,
    null,
  );
  const secondPage =
    await api.functional.communityPlatform.member.profiles.files.index(
      memberConnection,
      {
        body: {
          category: sharedCategory,
          extension: "png",
          mime_type: "image/png",
          size_min: 100,
          size_max: 200,
          sort: "original_name+asc",
          page: 2,
          limit: 1,
        } satisfies ICommunityPlatformProfileFile.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
  TestValidator.equals(
    "second page filtered record count",
    secondPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "second page filtered page count",
    secondPage.pagination.pages,
    2,
  );
  TestValidator.equals("second page data length", secondPage.data.length, 1);
  TestValidator.equals(
    "second page second id ordered by original_name asc",
    secondPage.data[0]?.id,
    fileB.id,
  );
  TestValidator.equals(
    "second page original name sorted result",
    secondPage.data[0]?.original_name,
    "beta-filter-target.png",
  );
  TestValidator.equals(
    "second page size upper bound match",
    secondPage.data[0]?.size,
    200,
  );
  TestValidator.predicate(
    "second page size within requested range",
    (secondPage.data[0]?.size ?? 0) >= 100 &&
      (secondPage.data[0]?.size ?? 0) <= 200,
  );
  TestValidator.equals(
    "second page excludes logically removed rows in ordinary results",
    secondPage.data[0]?.deleted_at,
    null,
  );
  const broadPage =
    await api.functional.communityPlatform.member.profiles.files.index(
      memberConnection,
      {
        body: {
          sort: "original_name+asc",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformProfileFile.IRequest,
      },
    );
  typia.assert(broadPage);
  const returnedIds = broadPage.data.map((file) => file.id);
  TestValidator.predicate(
    "broad page contains first created member-owned file",
    returnedIds.includes(fileA.id),
  );
  TestValidator.predicate(
    "broad page contains second created member-owned file",
    returnedIds.includes(fileB.id),
  );
  TestValidator.predicate(
    "broad page contains third created member-owned file",
    returnedIds.includes(fileC.id),
  );
  TestValidator.predicate(
    "broad page ordinary results exclude deleted files",
    broadPage.data.every((file) => file.deleted_at === null),
  );
}
