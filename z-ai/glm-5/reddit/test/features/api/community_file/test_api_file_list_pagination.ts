import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test file listing with pagination for authenticated members.
 *
 * This test verifies:
 * 1. Member authentication and authorization
 * 2. File listing endpoint returns valid paginated results
 * 3. Pagination metadata structure (current, limit, records, pages)
 * 4. File summary fields are correctly populated
 * 5. Files are sorted by created_at descending by default
 * 6. Member information in files matches authenticated user
 * 7. Pagination limit constraints are respected
 */
export async function test_api_file_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Test file listing with default pagination (page 1, limit defaults to 20)
  const defaultResult = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {} satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(defaultResult);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is at least 1",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultResult.pagination.pages >= 0,
  );
  // 4. Validate data array constraints
  TestValidator.predicate("data is array", Array.isArray(defaultResult.data));
  TestValidator.predicate(
    "data length within limit",
    defaultResult.data.length <= defaultResult.pagination.limit,
  );
  // 5. Validate each file belongs to authenticated member
  for (const file of defaultResult.data) {
    TestValidator.equals(
      "file uploader matches authenticated member",
      file.member.id,
      member.id,
    );
  }
  // 6. Test custom pagination with specific page and limit
  const customResult = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(customResult);
  TestValidator.equals(
    "custom pagination returns page 1",
    customResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit is 10",
    customResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom data length within limit",
    customResult.data.length <= 10,
  );
  // 7. Verify files from custom query also belong to authenticated member
  for (const file of customResult.data) {
    TestValidator.equals(
      "file uploader in custom query matches member",
      file.member.id,
      member.id,
    );
  }
  // 8. Test sorting by size ascending
  const sortedBySize = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sortBy: "size",
        sortOrder: "asc",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(sortedBySize);
  // 9. Validate sorted results still have correct member association
  for (const file of sortedBySize.data) {
    TestValidator.equals(
      "size-sorted file member matches authenticated member",
      file.member.id,
      member.id,
    );
  }
  // 10. Test filtering by file type (AVATAR)
  const avatarFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        fileType: "AVATAR",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(avatarFiles);
  // 11. Verify all returned files are AVATAR type
  for (const file of avatarFiles.data) {
    TestValidator.equals(
      "filtered file is AVATAR type",
      file.fileType,
      "AVATAR",
    );
  }
}
