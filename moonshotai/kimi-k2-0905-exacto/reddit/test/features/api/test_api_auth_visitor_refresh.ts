import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";

export async function test_api_auth_visitor_refresh(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVisitor.IAuthorized =
    await api.functional.auth.visitor.refresh(connection);
  typia.assert(output);
}
