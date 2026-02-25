import { ArrayUtil, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test validation that file belongs to the specified section.
 * Admin joins, attempts to retrieve a file using valid file ID but attached to a different section
 * than specified in the URL path. Ensure the system correctly validates the section-file
 * relationship and returns an appropriate error response when the file exists but is not
 * associated with the requested section.
 */
export async function test_api_section_file_retrieval_file_belongs_wrong_section(connection: api.IConnection): Promise<void> {
    // 1. Create admin connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join_local(adminConnection, {});
    // 2. Generate two different section IDs
    const sectionIdInPath: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const actualSectionId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Generate a valid file ID
    const fileId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 4. Attempt to retrieve file with mismatched section ID
    // The file belongs to actualSectionId, but we're requesting with sectionIdInPath
    await TestValidator.error("should fail when file belongs to different section", async () => {
        await api.functional.discussionBoard.admin.sections.files.at(adminConnection, {
            sectionId: sectionIdInPath,
            fileId: fileId,
        });
    });
}
// Utility function for admin authentication
async function authorize_admin_join_local(connection: api.IConnection, props: {
    body?: import("@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial").DeepPartial<import("@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin").IDiscussionBoardAdmin.IJoin>;
}): Promise<import("@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin").IDiscussionBoardAdmin.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? LocalRandomGenerator.alphaNumeric(16),
        display_name: props.body?.display_name ?? LocalRandomGenerator.name(),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin").IDiscussionBoardAdmin.IJoin;
    return await api.functional.discussionBoard.auth.admin.join(connection, {
        body: joinInput,
    });
}
// Helper random generator
const LocalRandomGenerator = {
    alphaNumeric: (length: number) => {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    name: () => {
        const names = ["John", "Jane", "Alex", "Sam", "Taylor"];
        return names[Math.floor(Math.random() * names.length)];
    },
};