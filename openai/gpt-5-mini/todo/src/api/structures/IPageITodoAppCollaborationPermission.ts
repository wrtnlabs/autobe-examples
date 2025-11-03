import { IPage } from "./IPage";
import { ITodoAppCollaborationPermission } from "./ITodoAppCollaborationPermission";

export namespace IPageITodoAppCollaborationPermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppCollaborationPermission.ISummary[];
  };
}
