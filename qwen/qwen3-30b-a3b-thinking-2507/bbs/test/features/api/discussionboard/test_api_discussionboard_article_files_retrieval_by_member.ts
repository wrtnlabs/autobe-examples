import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleFileDisplayInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFileDisplayInfo";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_discussionboard_article_files_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: RandomGenerator.paragraph(),
      referrer: RandomGenerator.paragraph(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Step 2: Generate a random articleCode UUID for the test
  const articleCode = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Fetch file attachments for the article
  const fileList =
    await api.functional.discussionBoard.member.articles.files.patchByArticlecode(
      memberConnection,
      {
        articleCode,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(fileList);
  // Step 4: Validate the response structure
  TestValidator.equals(
    "response should include pagination data",
    fileList.pagination,
    { current: 0, limit: 0, records: 0, pages: 0 },
  );
  // Step 5: Validate each file attachment has proper metadata
  for (const file of fileList.data) {
    typia.assert(file); // Ensure file structure is valid
    TestValidator.equals(
      "file ID should follow UUID format",
      file.id.length === 36,
      true,
    );
    TestValidator.equals(
      "file type should match valid format",
      ["PDF", "DOCX", "XLSX"].includes(file.file_type),
      true,
    );
    TestValidator.equals(
      "file size should be positive",
      file.file_size > 0,
      true,
    );
    TestValidator.equals(
      "display info should contain icon and size",
      file.display_info !== undefined,
      true,
    );
  }
}
