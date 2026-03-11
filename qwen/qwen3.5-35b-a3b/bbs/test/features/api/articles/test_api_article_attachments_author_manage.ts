import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_article_attachments_author_manage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with token from registration
  const adminConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 2. Use a random articleId (article creation is not in the available SDK functions)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin adds image attachment
  const firstAttachmentResult =
    await api.functional.economicPoliticalBoard.admin.articles.attachments.updateAttachments(
      adminConnectionWithToken,
      {
        articleId,
        body: {
          operations: [
            {
              action: "add",
              fileUrl: typia.random<string & tags.Format<"uri">>(),
              fileName: typia.random<string>() + ".jpg",
              fileType: "image" as const,
            },
          ],
        },
      },
    );
  typia.assert(firstAttachmentResult);
  // 4. Verify first attachment was added
  TestValidator.equals(
    "first attachment count",
    firstAttachmentResult.data.length,
    1,
  );
  // 5. Admin adds document attachment
  const secondAttachmentResult =
    await api.functional.economicPoliticalBoard.admin.articles.attachments.updateAttachments(
      adminConnectionWithToken,
      {
        articleId,
        body: {
          operations: [
            {
              action: "add",
              fileUrl: typia.random<string & tags.Format<"uri">>(),
              fileName: typia.random<string>() + ".pdf",
              fileType: "file" as const,
            },
          ],
        },
      },
    );
  typia.assert(secondAttachmentResult);
  // 6. Verify both attachments exist
  TestValidator.equals(
    "second attachment count",
    secondAttachmentResult.data.length,
    2,
  );
  // 7. Remove first attachment from the list
  const firstAttachmentId = secondAttachmentResult.data[0]!.id;
  const thirdAttachmentResult =
    await api.functional.economicPoliticalBoard.admin.articles.attachments.updateAttachments(
      adminConnectionWithToken,
      {
        articleId,
        body: {
          operations: [
            {
              action: "remove",
              attachmentId: firstAttachmentId,
            },
          ],
        },
      },
    );
  typia.assert(thirdAttachmentResult);
  // 8. Verify attachment count decreased
  TestValidator.equals(
    "attachment count after removal",
    thirdAttachmentResult.data.length,
    1,
  );
  // 9. Verify the removed attachment is no longer in the list
  const remainingAttachmentIds = thirdAttachmentResult.data.map(
    (att) => att.id,
  );
  TestValidator.predicate(
    "removed attachment not in list",
    !remainingAttachmentIds.includes(firstAttachmentId),
  );
}
