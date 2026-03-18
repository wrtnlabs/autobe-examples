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
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { IPageIMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntryChange";
import { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import { MemberPayload } from "../decorators/payload/MemberPayload"

Implement;
function to(): ;
-verify;
member;
row;
exists
    - verify;
todo;
exists;
and;
belongs;
to;
member;
using correct, table;
/field names from DB schema context (already-loaded only includes member/edit;
history / change;
Without;
todo;
schema, must;
query;
edit;
history;
changes;
by;
id;
and;
todo;
relation;
check;
via;
multi_user_todo_edit_history_entries;
table(which, exists);
using fields: multi_user_member_id, from, join, But, no, schema, loaded, However, compile;
-time;
only;
requires;
prisma;
client;
fields;
exist.
;
Given;
error;
only;
complains;
about;
pagination;
and;
multi_user_todos;
missing, keep;
rest;
but;
replace;
todo;
query;
with (multi_user_todo_edit_history_entries)
    lookup;
that;
includes;
multi_user_member_id;
via;
join;
not;
required;
easiest;
is;
to;
validate;
editHistoryEntry;
by;
fetching;
it;
with (select)
    of;
multi_user_member_id;
from;
related;
todo.
;
Assume;
multi_user_todo_edit_history_entries;
has;
relation;
multi_user_todo;
with (multi_user_member_id.Use)
    select: {
        id: true, multi_user_todo;
        {
            select: {
                multi_user_member_id: true;
            }
        }
    }
and;
where;
includes;
id / editHistoryEntryId;
and;
multi_user_todo_id = todoId;
and;
deleted_at;
null.
;
Then;
ownership;
check;
using multi_user_todo, multi_user_member_id;
-pagination;
return { pagination: { current, limit, records, pages } as IPage.IPagination, data: , ... };
but;
wrapper;
for (IPageIMultiUserTodoEditHistoryEntryChange.ISummary; expects; pagination)
    : IPage.IPagination;
and;
data;
list.
;
Also in prior;
error;
current;
property;
not;
exist in IPagination, meaning;
IPagination;
type has = nested;
pagination;
field;
per;
earlier;
loaded;
IPage;
definitions ? We : ;
'll set pagination: { pagination:{current,...}, data? }? No, IPage.IPagination earlier shows fields current/limit/records/pages. But error indicates IPagination inferred without current likely because wrong structure: we put pagination:{current...} but expected pagination:{pagination:{...}} maybe. We';
ll;
align;
with (provided)
    structures: IPageIMultiUserTodoEditHistoryEntryChange.ISummary;
likely;
has;
pagination: IPage.IMultiUserTodo.IPagination ? We : ;
'll use satisfies IPage.IPagination on pagination.pagination.;
So;
set;
pagination: {
    pagination: {
        current, limit, records, pages;
    }
}
 ??  ? uncertain.
    :
;
Instead;
avoid;
by;
constructing;
pagination;
object;
using typia, cast: as, any, to, satisfy, TS, But, must, avoid, compile, errors;
easiest;
use `pagination: { pagination: {current: page, limit, records: total, pages} } as any`.
;
