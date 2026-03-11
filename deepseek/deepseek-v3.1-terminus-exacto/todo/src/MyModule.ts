import { Module } from "@nestjs/common";

import { MultiusertodoAdminAdminsPassword_resetsController } from "./controllers/multiUserTodo/admin/admins/password-resets/MultiusertodoAdminAdminsPassword_resetsController";
import { MultiusertodoAdminAdminsSessionsController } from "./controllers/multiUserTodo/admin/admins/sessions/MultiusertodoAdminAdminsSessionsController";
import { MultiusertodoAdminAudit_logsController } from "./controllers/multiUserTodo/admin/audit-logs/MultiusertodoAdminAudit_logsController";
import { MultiusertodoAdminBackup_logsController } from "./controllers/multiUserTodo/admin/backup-logs/MultiusertodoAdminBackup_logsController";
import { MultiusertodoAdminData_retention_policiesController } from "./controllers/multiUserTodo/admin/data-retention-policies/MultiusertodoAdminData_retention_policiesController";
import { MultiusertodoAdminError_logsController } from "./controllers/multiUserTodo/admin/error-logs/MultiusertodoAdminError_logsController";
import { MultiusertodoAdminPerformance_metricsController } from "./controllers/multiUserTodo/admin/performance-metrics/MultiusertodoAdminPerformance_metricsController";
import { MultiusertodoAdminSystem_configurationsController } from "./controllers/multiUserTodo/admin/system-configurations/MultiusertodoAdminSystem_configurationsController";
import { MultiusertodoAdminSystem_maintenance_logsController } from "./controllers/multiUserTodo/admin/system-maintenance-logs/MultiusertodoAdminSystem_maintenance_logsController";
import { MultiusertodoAdminUptime_monitoringsController } from "./controllers/multiUserTodo/admin/uptime-monitorings/MultiusertodoAdminUptime_monitoringsController";
import { MultiusertodoAdminsController } from "./controllers/multiUserTodo/admins/MultiusertodoAdminsController";
import { MultiusertodoAuthAdminController } from "./controllers/multiUserTodo/auth/admin/MultiusertodoAuthAdminController";
import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoGuestsController } from "./controllers/multiUserTodo/guests/MultiusertodoGuestsController";
import { MultiusertodoMemberCompletionController } from "./controllers/multiUserTodo/member/completion/MultiusertodoMemberCompletionController";
import { MultiusertodoMemberFilter_settingsController } from "./controllers/multiUserTodo/member/filter-settings/MultiusertodoMemberFilter_settingsController";
import { MultiusertodoMemberFilter_settingsSetting_valuesController } from "./controllers/multiUserTodo/member/filter-settings/setting-values/MultiusertodoMemberFilter_settingsSetting_valuesController";
import { MultiusertodoMemberMembersPassword_resetsController } from "./controllers/multiUserTodo/member/members/password-resets/MultiusertodoMemberMembersPassword_resetsController";
import { MultiusertodoMemberMembersSessionsController } from "./controllers/multiUserTodo/member/members/sessions/MultiusertodoMemberMembersSessionsController";
import { MultiusertodoMemberPermanent_deleteController } from "./controllers/multiUserTodo/member/permanent-delete/MultiusertodoMemberPermanent_deleteController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberController } from "./controllers/multiUserTodo/member/restore/MultiusertodoMemberController";
import { MultiusertodoMemberSorting_preferencesController } from "./controllers/multiUserTodo/member/sorting-preferences/MultiusertodoMemberSorting_preferencesController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTodosCompletion_statusesController } from "./controllers/multiUserTodo/member/todos/completion-statuses/MultiusertodoMemberTodosCompletion_statusesController";
import { MultiusertodoMemberTodosEdit_historiesController } from "./controllers/multiUserTodo/member/todos/edit-histories/MultiusertodoMemberTodosEdit_historiesController";
import { MultiusertodoMemberTodosEdit_historiesField_changesController } from "./controllers/multiUserTodo/member/todos/edit-histories/field-changes/MultiusertodoMemberTodosEdit_historiesField_changesController";
import { MultiusertodoMemberTodosEdit_history_snapshotsController } from "./controllers/multiUserTodo/member/todos/edit-history-snapshots/MultiusertodoMemberTodosEdit_history_snapshotsController";
import { MultiusertodoMemberTodosSnapshotsController } from "./controllers/multiUserTodo/member/todos/snapshots/MultiusertodoMemberTodosSnapshotsController";
import { MultiusertodoMemberTodosTrash_entriesController } from "./controllers/multiUserTodo/member/todos/trash-entries/MultiusertodoMemberTodosTrash_entriesController";
import { MultiusertodoMemberView_statsController } from "./controllers/multiUserTodo/member/view-stats/MultiusertodoMemberView_statsController";
import { MultiusertodoMembersController } from "./controllers/multiUserTodo/members/MultiusertodoMembersController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoAuthAdminController,
    MultiusertodoGuestsController,
    MultiusertodoMembersController,
    MultiusertodoMemberProfileController,
    MultiusertodoAdminsController,
    MultiusertodoMemberMembersSessionsController,
    MultiusertodoAdminAdminsSessionsController,
    MultiusertodoMemberMembersPassword_resetsController,
    MultiusertodoAdminAdminsPassword_resetsController,
    MultiusertodoAdminAudit_logsController,
    MultiusertodoAdminSystem_configurationsController,
    MultiusertodoAdminPerformance_metricsController,
    MultiusertodoAdminUptime_monitoringsController,
    MultiusertodoAdminError_logsController,
    MultiusertodoAdminSystem_maintenance_logsController,
    MultiusertodoAdminData_retention_policiesController,
    MultiusertodoAdminBackup_logsController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTodosTrash_entriesController,
    MultiusertodoMemberTodosSnapshotsController,
    MultiusertodoMemberFilter_settingsController,
    MultiusertodoMemberView_statsController,
    MultiusertodoMemberTodosCompletion_statusesController,
    MultiusertodoMemberSorting_preferencesController,
    MultiusertodoMemberFilter_settingsSetting_valuesController,
    MultiusertodoMemberTodosEdit_historiesController,
    MultiusertodoMemberTodosEdit_historiesField_changesController,
    MultiusertodoMemberTodosEdit_history_snapshotsController,
    MultiusertodoMemberCompletionController,
    MultiusertodoMemberController,
    MultiusertodoMemberPermanent_deleteController,
  ],
})
export class MyModule {}
