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

export async function test_api_profile_file_list_own_profile(
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
  const created =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {},
    );
  typia.assert(created);
  const exactSize = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    created.size satisfies number as number,
  );
  const request: ICommunityPlatformProfileFile.IRequest = {
    category: created.category,
    original_name: created.original_name,
    extension: created.extension,
    mime_type: created.mime_type,
    size_min: exactSize,
    size_max: exactSize,
    sort: "created_at+desc",
    page: 1,
    limit: 10,
  };
  const page =
    await api.functional.communityPlatform.member.profiles.files.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals("requested current page", page.pagination.current, 1);
  TestValidator.equals("requested page limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "returned data count does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records cover current data length",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination pages positive when records exist",
    page.pagination.records === 0 || page.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination capacity covers records",
    page.pagination.pages === 0 ||
      page.pagination.pages * page.pagination.limit >= page.pagination.records,
  );
  TestValidator.predicate("at least one file returned", page.data.length >= 1);
  TestValidator.predicate(
    "created file is included",
    ArrayUtil.has(page.data, (item) => item.id === created.id),
  );
  for (const item of page.data) {
    typia.assertEquals<ICommunityPlatformProfileFile.ISummary>(item);
    TestValidator.equals(
      "category matches filter",
      item.category,
      created.category,
    );
    TestValidator.equals(
      "original name matches filter",
      item.original_name,
      created.original_name,
    );
    TestValidator.equals(
      "extension matches filter",
      item.extension,
      created.extension,
    );
    TestValidator.equals(
      "mime type matches filter",
      item.mime_type,
      created.mime_type,
    );
    TestValidator.equals(
      "size matches exact size range",
      item.size,
      created.size,
    );
    TestValidator.predicate(
      "url is exposed for management",
      item.url.length > 0,
    );
    TestValidator.equals(
      "deleted_at matches created file lifecycle",
      item.deleted_at,
      created.deleted_at,
    );
  }
  const reread =
    await api.functional.communityPlatform.member.profiles.files.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(reread);
  TestValidator.predicate(
    "created file remains visible after read-only listing",
    ArrayUtil.has(reread.data, (item) => item.id === created.id),
  );
  TestValidator.predicate(
    "read-only listing does not reduce matching record count",
    reread.pagination.records >= page.pagination.records,
  );
}
