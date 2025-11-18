import { IPage } from "./IPage";
import { ITodoAppSystemSettings } from "./ITodoAppSystemSettings";

export namespace IPageITodoAppSystemSettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppSystemSettings.ISummary[];
  };
}
