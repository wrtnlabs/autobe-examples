import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
import { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import { MemberPayload } from "../decorators/payload/MemberPayload"

Use;
MyGlobal.prisma.multi_user_todo.findUniqueOrThrow ? can : ;
't since todo schema missing; but we can query multi_user_todo_edit_history_entries with where { multi_user_todo_id: todoId, deleted_at:null } and then further filter by joining todo via relation property `todo` but with correct field name `multi_user_todo_id` or similar. From error hint, property inside todo filter should be `multi_user_todo_id` (did you mean). We';
ll;
change;
to;
todo: {
    multi_user_todo_id: props.member.id;
}
which;
is;
wrong.Better;
remove;
todo;
filter;
and;
do
    ownership;
while (check);
by;
fetching;
todo;
by;
id;
and;
member;
before;
query.We;
'll call MyGlobal.prisma.multi_user_todos which likely exists and has field multi_user_todo_member_id or similar. But previously error said multi_user_todos doesn';
t;
exist;
so;
correct;
table;
name;
may;
be;
multi_user_todos.Need;
schema.We;
'll load multi_user_todos schema.;
