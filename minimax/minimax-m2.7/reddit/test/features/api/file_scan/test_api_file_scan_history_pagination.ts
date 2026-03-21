import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_file_scan_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload multiple files to generate virus scan records
  const files = await ArrayUtil.asyncRepeat(5, async () => {
    const file = await generate_random_reddit_clone_member_files_create(
      memberConnection,
      {
        body: {
          target_type: "user",
        },
      },
    );
    typia.assert(file);
    return file;
  });
  // 3. Retrieve scan history with pagination: page=1, limit=10
  const firstFileId = files[0].id;
  const page1 = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: firstFileId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(page1);
  // 4. Verify response includes pagination metadata with correct structure
  TestValidator.equals("page1 current page", page1.pagination.current, 1);
  TestValidator.predicate(
    "page1 has pagination metadata",
    page1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "page1 has records count",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("page1 has pages count", page1.pagination.pages >= 0);
  // 5. Retrieve second page: page=2, limit=10
  const page2 = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: firstFileId,
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(page2);
  // 6. Verify different records on page 2 (or both empty if no scans)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((s) => s.id);
    const page2Ids = page2.data.map((s) => s.id);
    TestValidator.predicate(
      "no duplicate scan records across pages",
      !page1Ids.some((id) => page2Ids.includes(id)),
    );
  }
  // 7. Test limit boundary: limit=100 (max allowed)
  const maxLimitPage = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: firstFileId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "max limit returns valid pagination",
    maxLimitPage.pagination.limit > 0,
  );
  // 8. Verify total records count consistency
  TestValidator.equals(
    "page1 and page2 pagination records match",
    page1.pagination.records,
    page2.pagination.records,
  );
  // 9. Verify scan records sorted by scanned_at descending
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      const prevDate = new Date(page1.data[i - 1].scanned_at).getTime();
      const currDate = new Date(page1.data[i].scanned_at).getTime();
      TestValidator.predicate(
        `page1 scan ${i - 1} scanned_at >= scan ${i} scanned_at`,
        prevDate >= currDate,
      );
    }
  }
  if (page2.data.length > 1) {
    for (let i = 1; i < page2.data.length; i++) {
      const prevDate = new Date(page2.data[i - 1].scanned_at).getTime();
      const currDate = new Date(page2.data[i].scanned_at).getTime();
      TestValidator.predicate(
        `page2 scan ${i - 1} scanned_at >= scan ${i} scanned_at`,
        prevDate >= currDate,
      );
    }
  }
  // 10. Verify scan records belong to the correct file
  for (const scan of page1.data) {
    TestValidator.equals("scan belongs to file", scan.file.id, firstFileId);
  }
  for (const scan of page2.data) {
    TestValidator.equals("scan belongs to file", scan.file.id, firstFileId);
  }
}
